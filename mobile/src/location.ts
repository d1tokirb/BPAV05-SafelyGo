import { isRunningInExpoGo } from "expo";
import * as Location from "expo-location";
import * as TaskManager from "expo-task-manager";
import { Platform } from "react-native";
import { storage } from "./storage";
import { api, API_URL, ApiError } from "./api";
import type { SharingSession } from "./types";
const TASK = "safelygo-location";
let tracking: { id: string; background: boolean } | null = null;
export const getTrackingState = () => tracking;
export async function canTrackInBackground() {
  return (
    Platform.OS !== "web" &&
    !isRunningInExpoGo() &&
    (await TaskManager.isAvailableAsync())
  );
}
let subscription: Location.LocationSubscription | null = null;
let expiry: ReturnType<typeof setTimeout> | null = null;
let onFailure: ((message: string) => void) | null = null;
async function stopBackground() {
  if (
    (await canTrackInBackground()) &&
    (await Location.hasStartedLocationUpdatesAsync(TASK))
  )
    await Location.stopLocationUpdatesAsync(TASK);
}
async function clearBackgroundTask() {
  try {
    await storage.remove("sharing-task");
  } finally {
    await stopBackground();
  }
}
if (Platform.OS !== "web")
  TaskManager.defineTask<{ locations: Location.LocationObject[] }>(
    TASK,
    async ({ data, error }) => {
      if (error || !data) return;
      const raw = await storage.get("sharing-task");
      if (!raw) return;
      const saved = JSON.parse(raw) as {
        id: string;
        token: string;
        expiresAt: string;
      };
      if (Date.now() >= Date.parse(saved.expiresAt)) {
        await clearBackgroundTask();
        return;
      }
      const location = data.locations[data.locations.length - 1];
      if (!location) return;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 12000);
      try {
        const response = await fetch(
          API_URL + "/api/sharing/" + saved.id + "/location",
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              Authorization: "Bearer " + saved.token,
            },
            body: JSON.stringify({
              latitude: location.coords.latitude,
              longitude: location.coords.longitude,
              accuracy: location.coords.accuracy ?? undefined,
            }),
            signal: controller.signal,
          },
        );
        if ([401, 403, 404, 410].includes(response.status)) {
          await clearBackgroundTask();
        }
      } catch {
        /* Retry on the next OS-delivered position; never cache location history. */
      } finally {
        clearTimeout(timeout);
      }
    },
  );
export async function locate() {
  const p = await Location.requestForegroundPermissionsAsync();
  if (!p.granted)
    throw new Error(
      "Location permission is required for this action. Enable it in device settings and try again.",
    );
  return Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Balanced,
  });
}
export async function stopTracking() {
  subscription?.remove();
  subscription = null;
  tracking = null;
  if (expiry) clearTimeout(expiry);
  expiry = null;
  await clearBackgroundTask();
}
export async function startTracking(
  session: SharingSession,
  background: boolean,
  onError: (message: string) => void,
) {
  await stopTracking();
  onFailure = onError;
  const p = await Location.requestForegroundPermissionsAsync();
  if (!p.granted)
    throw new Error("Allow location access before starting sharing.");
  if (background) {
    if (!(await canTrackInBackground()))
      throw new Error(
        "Background sharing needs an installed SafelyGo build. Choose sharing while the app is open.",
      );
    const p = await Location.requestBackgroundPermissionsAsync();
    if (!p.granted)
      throw new Error(
        "Allow background location, or choose sharing while the app is open.",
      );
  }
  const send = async (location: Location.LocationObject) => {
    try {
      await api.request("/sharing/" + session.id + "/location", "PUT", {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracy: location.coords.accuracy ?? undefined,
      });
      onFailure?.("");
    } catch (e) {
      onFailure?.(e instanceof Error ? e.message : "Location update failed.");
      if (e instanceof ApiError && [401, 403, 404, 410].includes(e.status))
        await stopTracking();
    }
  };
  const initial = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Balanced,
  });
  await api.request("/sharing/" + session.id + "/location", "PUT", {
    latitude: initial.coords.latitude,
    longitude: initial.coords.longitude,
    accuracy: initial.coords.accuracy ?? undefined,
  });
  if (background && api.token) {
    await storage.set(
      "sharing-task",
      JSON.stringify({
        id: session.id,
        token: api.token,
        expiresAt: session.expires_at,
      }),
    );
    await Location.startLocationUpdatesAsync(TASK, {
      accuracy: Location.Accuracy.Balanced,
      timeInterval: 10000,
      distanceInterval: 10,
      deferredUpdatesInterval: 10000,
      pausesUpdatesAutomatically: false,
      showsBackgroundLocationIndicator: true,
      foregroundService: {
        notificationTitle: "SafelyGo location sharing",
        notificationBody:
          "Your selected contacts can see your location until this session ends.",
        killServiceOnDestroy: true,
      },
    });
  } else
    subscription = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.Balanced,
        timeInterval: 10000,
        distanceInterval: 5,
      },
      send,
    );
  tracking = { id: session.id, background };
  expiry = setTimeout(
    () => {
      void stopTracking().catch(() => onFailure?.("This walk expired and contact access ended. Device cleanup could not be confirmed. Disable SafelyGo’s location permission in device settings."));
    },
    Math.max(0, Date.parse(session.expires_at) - Date.now()),
  );
}
