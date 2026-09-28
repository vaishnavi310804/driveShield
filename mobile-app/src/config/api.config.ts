import Constants from "expo-constants";
import { Platform } from "react-native";

/**
 * API Base URL Configuration for mobile <-> backend communication.
 * Allows configuring the backend server host for:
 * - Android Emulator (10.0.2.2)
 * - iOS Simulator / Localhost (localhost)
 * - Physical device or LAN IP (configured via EXPO_PUBLIC_API_URL or hostUri)
 */
const getBaseUrl = (): string => {
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }

  // Fallback for Android Emulator (10.0.2.2 routes to host localhost:5000)
  if (Platform.OS === "android") {
    return "http://10.0.2.2:5000/api";
  }

  // Handle Expo Go / Metro bundler host IP detection if running on physical device
  const hostUri = Constants.expoConfig?.hostUri;
  if (hostUri) {
    const ip = hostUri.split(":")[0];
    if (ip && ip !== "localhost" && ip !== "127.0.0.1") {
      return `http://${ip}:5000/api`;
    }
  }

  return "http://localhost:5000/api";
};

export const API_BASE_URL = getBaseUrl();


