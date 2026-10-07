import type { ExpoConfig } from "expo/config";
// Fail before signing a release with a local API or incomplete native maps setup.
if (process.env.SAFELYGO_RELEASE === "true") {
  const api = new URL(process.env.EXPO_PUBLIC_API_URL || "http://localhost");
  if (api.protocol !== "https:" || /^(localhost|127\.|0\.|\[::1\])/.test(api.hostname) || api.hostname.endsWith(".local") || api.username || api.password || api.search || api.hash)
    throw new Error("Release builds require a public HTTPS EXPO_PUBLIC_API_URL without credentials, query or fragment.");
  if (!process.env.EAS_PROJECT_ID)
    throw new Error("Release builds require EAS_PROJECT_ID.");
  if (process.env.EAS_BUILD_PLATFORM === "android" && !process.env.GOOGLE_MAPS_ANDROID_API_KEY)
    throw new Error("Android releases require GOOGLE_MAPS_ANDROID_API_KEY.");
  if (process.env.EXPO_PUBLIC_DEMO_LOGIN === "true")
    throw new Error("Test login must be disabled for release builds.");
}
const config: ExpoConfig = {
  name: "SafelyGo",
  slug: "safelygo",
  scheme: "safelygo",
  version: "1.0.0",
  orientation: "portrait",
  userInterfaceStyle: "light",
  icon: "./assets/icon.png",
  ios: {
    supportsTablet: true,
    bundleIdentifier: "app.safelygo.mobile",
    infoPlist: { ITSAppUsesNonExemptEncryption: false },
  },
  android: {
    package: "app.safelygo.mobile",
    adaptiveIcon: {
      foregroundImage: "./assets/adaptive-icon.png",
      backgroundColor: "#285CC4",
    },
  },
  web: { favicon: "./assets/favicon.png" },
  plugins: [
    "expo-router",
    [
      "expo-splash-screen",
      {
        image: "./assets/splash-icon.png",
        imageWidth: 180,
        backgroundColor: "#F6F7FB",
      },
    ],
    [
      "expo-location",
      {
        locationWhenInUsePermission:
          "SafelyGo uses your location to place safety reports and share with contacts you choose.",
        locationAlwaysAndWhenInUsePermission:
          "SafelyGo shares your location in the background only during an active, time-limited sharing session.",
        isIosBackgroundLocationEnabled: true,
        isAndroidBackgroundLocationEnabled: true,
        isAndroidForegroundServiceEnabled: true,
      },
    ],
    "expo-secure-store",
    "expo-font",
    [
      "react-native-maps",
      {
        androidGoogleMapsApiKey: process.env.GOOGLE_MAPS_ANDROID_API_KEY || "",
      },
    ],
  ],
  extra: process.env.EAS_PROJECT_ID
    ? { eas: { projectId: process.env.EAS_PROJECT_ID } }
    : {},
};
export default config;
