/**
 * Motion Telemetry Data Types for Smartphone Motion Sensors.
 */

/**
 * Normalized 3-axis motion telemetry reading.
 */
export interface MotionTelemetryData {
  /** Accelerometer X-axis value in Gs */
  accelX: number;
  /** Accelerometer Y-axis value in Gs */
  accelY: number;
  /** Accelerometer Z-axis value in Gs */
  accelZ: number;
  /** Derived total G-force magnitude: sqrt(accelX^2 + accelY^2 + accelZ^2) */
  gForce: number;
  /** Gyroscope X-axis rotation rate in rad/s */
  gyroX: number;
  /** Gyroscope Y-axis rotation rate in rad/s */
  gyroY: number;
  /** Gyroscope Z-axis rotation rate in rad/s */
  gyroZ: number;
  /** ISO 8601 UTC timestamp of the sensor reading */
  timestamp: string;
}

/**
 * Sensor availability state on current device.
 */
export interface SensorAvailability {
  accelerometer: boolean;
  gyroscope: boolean;
}

/**
 * Configuration options for sensor collection.
 */
export interface SensorCollectorOptions {
  /**
   * Update interval in milliseconds.
   * Example intervals:
   * - 200ms = 5 Hz sampling rate
   * - 500ms = 2 Hz sampling rate
   * - 1000ms = 1 Hz sampling rate
   * Default: 200ms
   */
  updateIntervalMs?: number;
}
