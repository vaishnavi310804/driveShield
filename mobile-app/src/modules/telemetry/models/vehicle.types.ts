/**
 * Data contracts for Vehicle / OBD Telemetry.
 */

/**
 * Normalized Vehicle / OBD Telemetry Data object matching backend telemetry schema.
 */
export interface VehicleTelemetryData {
  /** Vehicle speed in km/h */
  speed: number;
  /** Engine speed in revolutions per minute (RPM) */
  rpm: number;
  /** Engine load percentage (0 - 100%) */
  engineLoad?: number;
  /** Throttle position percentage (0 - 100%) */
  throttle?: number;
  /** Coolant temperature in degrees Celsius (°C) */
  coolantTemp?: number;
  /** Battery/alternator system voltage in volts (V) */
  batteryVoltage?: number;
  /** Active OBD Diagnostic Trouble Codes (e.g. ["P0300"]) */
  diagnosticFaults: string[];
  /** ISO 8601 UTC timestamp of the telemetry observation */
  timestamp: string;
}

/**
 * Deterministic simulation mode for VehicleTelemetrySimulator.
 */
export type VehicleSimulationMode = 'NORMAL' | 'STALL' | 'CRITICAL_PARAMETER';

/**
 * Configuration options for VehicleTelemetrySimulator.
 */
export interface VehicleSimulatorOptions {
  /** Initial simulation mode (default: 'NORMAL') */
  mode?: VehicleSimulationMode;
  /** Update interval in milliseconds (default: 500ms = 2 Hz) */
  updateIntervalMs?: number;
}
