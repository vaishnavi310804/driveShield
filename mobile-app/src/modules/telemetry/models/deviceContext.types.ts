/**
 * Data contracts for Device Context Telemetry Collection.
 */

/**
 * Normalized network connection state.
 */
export type NetworkType = 'WIFI' | 'CELLULAR' | 'NONE' | 'UNKNOWN';

/**
 * Normalized Device Context Telemetry object.
 */
export interface DeviceContextTelemetryData {
  /**
   * Battery level percentage from 0 to 100.
   * Represented as -1 if battery information is unavailable on the device.
   */
  batteryLevel: number;
  /** True if the device is plugged in and charging or fully charged */
  isCharging: boolean;
  /** Current network connectivity state: WIFI, CELLULAR, NONE, or UNKNOWN */
  networkState: NetworkType;
  /** ISO 8601 UTC timestamp of the observation */
  timestamp: string;
}

/**
 * Device context feature availability state on current hardware.
 */
export interface DeviceContextAvailability {
  battery: boolean;
  network: boolean;
}

/**
 * Configuration options for Device Context Collection.
 */
export interface DeviceContextCollectorOptions {
  /**
   * Refresh interval in milliseconds for polling low-frequency device states like network.
   * Default: 10000ms (10 seconds)
   */
  refreshIntervalMs?: number;
}
