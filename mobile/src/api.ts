import { Platform } from "react-native";
export const API_URL = (
  (Platform.OS === "web"
    ? process.env.EXPO_PUBLIC_WEB_API_URL || process.env.EXPO_PUBLIC_API_URL
    : process.env.EXPO_PUBLIC_API_URL) || "http://localhost:4000"
).replace(/\/$/, "");
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public fields: Record<string, string> = {},
  ) {
    super(message);
  }
}
// One boundary for authentication, timeouts, validation errors, and typed API results.
export class ApiClient {
  token: string | null = null;
  async request<T>(path: string, method = "GET", body?: unknown): Promise<T> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);
    try {
      const response = await fetch(API_URL + "/api" + path, {
        method,
        headers: {
          "Content-Type": "application/json",
          ...(this.token ? { Authorization: "Bearer " + this.token } : {}),
        },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: controller.signal,
      });
      if (response.status === 204) return undefined as T;
      const data = await response.json();
      if (!response.ok)
        throw new ApiError(
          response.status,
          data.error || "Request failed.",
          data.fields || {},
        );
      return data as T;
    } catch (e) {
      if (e instanceof ApiError) throw e;
      throw new Error(
        "Cannot connect to SafelyGo. Check your connection and try again.",
      );
    } finally {
      clearTimeout(timer);
    }
  }
}
export const api = new ApiClient();
