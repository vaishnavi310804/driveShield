import * as Location from 'expo-location';
import {
  LocationCollectorOptions,
  LocationPermissionStatus,
  LocationTelemetryData,
} from '../models/location.types';

export type LocationSubscription = Location.LocationSubscription;

/**
 * Converts speed from meters per second (m/s) to kilometers per hour (km/h).
 * Formula: km/h = m/s * 3.6
 *
 * @param speedMS - Speed in m/s (provided by expo-location)
 * @returns Speed in km/h rounded to 2 decimal places, or 0.0 if speed is invalid/negative
 */
export function convertMetersPerSecondToKmH(
  speedMS: number | null | undefined
): number {
  if (typeof speedMS !== 'number' || speedMS < 0 || isNaN(speedMS)) {
    return 0;
  }
  const speedKmH = speedMS * 3.6;
  return Number(speedKmH.toFixed(2));
}

/**
 * Normalizes heading value from expo-location.
 *
 * @param headingDeg - Heading in degrees (0 - 360) provided by expo-location
 * @returns Heading in degrees rounded to 2 decimal places, or undefined if invalid/unavailable (-1)
 */
export function normalizeHeading(
  headingDeg: number | null | undefined
): number | undefined {
  if (
    typeof headingDeg !== 'number' ||
    headingDeg < 0 ||
    headingDeg > 360 ||
    isNaN(headingDeg)
  ) {
    return undefined;
  }
  return Number(headingDeg.toFixed(2));
}

export class LocationSensorCollector {
  private subscription: LocationSubscription | null = null;
  private isCollecting: boolean = false;

  /**
   * Checks if device location services are enabled and checks foreground permission status.
   */
  async checkPermissions(): Promise<LocationPermissionStatus> {
    try {
      const servicesEnabled = await Location.hasServicesEnabledAsync();
      if (!servicesEnabled) {
        return 'disabled';
      }

      const { status } = await Location.getForegroundPermissionsAsync();
      if (status === 'granted') {
        return 'granted';
      } else if (status === 'denied') {
        return 'denied';
      }
      return 'undetermined';
    } catch {
      return 'error';
    }
  }

  /**
   * Requests foreground location permissions from the user.
   */
  async requestPermissions(): Promise<LocationPermissionStatus> {
    try {
      const servicesEnabled = await Location.hasServicesEnabledAsync();
      if (!servicesEnabled) {
        return 'disabled';
      }

      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        return 'granted';
      } else if (status === 'denied') {
        return 'denied';
      }
      return 'undetermined';
    } catch {
      return 'error';
    }
  }

  /**
   * Starts collecting continuous GPS location telemetry.
   *
   * @param onData - Callback receiving normalized LocationTelemetryData
   * @param options - Configuration options (timeIntervalMs, distanceIntervalMeters, accuracy)
   */
  async start(
    onData: (data: LocationTelemetryData) => void,
    options: LocationCollectorOptions = {}
  ): Promise<void> {
    if (this.isCollecting) {
      this.stop();
    }

    const permissionState = await this.checkPermissions();
    if (permissionState !== 'granted') {
      throw new Error(
        `Cannot start location collection. Permission state: ${permissionState}`
      );
    }

    const {
      timeIntervalMs = 1000,
      distanceIntervalMeters = 0,
      accuracy = Location.Accuracy.Balanced,
    } = options;

    this.isCollecting = true;

    this.subscription = await Location.watchPositionAsync(
      {
        accuracy,
        timeInterval: Math.max(100, timeIntervalMs),
        distanceInterval: Math.max(0, distanceIntervalMeters),
      },
      (location: Location.LocationObject) => {
        if (!this.isCollecting) return;

        const { latitude, longitude, speed, heading } = location.coords;

        const normalizedData: LocationTelemetryData = {
          latitude: Number(latitude.toFixed(6)),
          longitude: Number(longitude.toFixed(6)),
          speed: convertMetersPerSecondToKmH(speed),
          heading: normalizeHeading(heading),
          timestamp: new Date(location.timestamp).toISOString(),
        };

        onData(normalizedData);
      }
    );
  }

  /**
   * Stops active location collection and unsubscribes from position updates.
   */
  stop(): void {
    this.isCollecting = false;

    if (this.subscription) {
      this.subscription.remove();
      this.subscription = null;
    }
  }

  /**
   * Returns whether location collection is currently active.
   */
  getIsCollecting(): boolean {
    return this.isCollecting;
  }
}
