import { LocationAccuracy } from 'expo-location';

/**
 * Normalized GPS / Location Telemetry Data.
 */
export interface LocationTelemetryData {
  /** Latitude in decimal degrees */
  latitude: number;
  /** Longitude in decimal degrees */
  longitude: number;
  /** Speed in km/h (converted from m/s: km/h = m/s * 3.6) */
  speed: number;
  /** Heading in degrees (0 - 360), undefined if unavailable or invalid */
  heading?: number;
  /** ISO 8601 UTC timestamp of the location fix */
  timestamp: string;
}

/**
 * Permission status states for location collection.
 */
export type LocationPermissionStatus =
  | 'undetermined'
  | 'requesting'
  | 'granted'
  | 'denied'
  | 'disabled'
  | 'error';

/**
 * Configuration options for location collector.
 */
export interface LocationCollectorOptions {
  /**
   * Minimum update interval in milliseconds.
   * Default: 1000ms
   */
  timeIntervalMs?: number;
  /**
   * Minimum distance change in meters required for an update.
   * Default: 0 meters (time-driven updates)
   */
  distanceIntervalMeters?: number;
  /**
   * Desired location accuracy level.
   * Uses LocationAccuracy from expo-location.
   * Default: LocationAccuracy.Balanced
   */
  accuracy?: LocationAccuracy;
}
