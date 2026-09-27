import { NetworkType } from './deviceContext.types';
import {
  AttentionState,
  DriverStateSimulationMode,
  GazeDirection,
  HeadPose,
} from './driverState.types';
import { VehicleSimulationMode } from './vehicle.types';

/**
 * Data contracts for Complete Unified Telemetry Aggregation.
 */

/**
 * Unified Mobile Telemetry Data object combining ALL 5 telemetry sources:
 * 1. location (Real device - GPS) [REQUIRED]
 * 2. motion (Real device - Accelerometer & Gyroscope) [REQUIRED]
 * 3. vehicleData (Simulated - OBD speed, RPM, load, throttle, temp, voltage, faults) [REQUIRED]
 * 4. deviceContext (Real device - Battery level, charging, network state) [OPTIONAL]
 * 5. driverState (Simulated - PERCLOS, gaze, head pose, attention state, blinks, yawns) [OPTIONAL]
 */
export interface UnifiedTelemetryData {
  /** ISO 8601 UTC timestamp of the aggregation/emission time */
  timestamp: string;

  /** Latest location reading (Required) */
  location: {
    /** Latitude in decimal degrees */
    latitude: number;
    /** Longitude in decimal degrees */
    longitude: number;
    /** GPS speed in km/h */
    speed: number;
    /** Heading in degrees (0 - 360), undefined if unavailable */
    heading?: number;
  };

  /** Latest motion sensor reading (Required) */
  motion: {
    /** Accelerometer X-axis in Gs */
    accelX: number;
    /** Accelerometer Y-axis in Gs */
    accelY: number;
    /** Accelerometer Z-axis in Gs */
    accelZ: number;
    /** Derived total G-force magnitude: sqrt(accelX^2 + accelY^2 + accelZ^2) */
    gForce: number;
    /** Gyroscope X-axis rotation rate in rad/s */
    gyroX: number;
    /** Gyroscope Y-axis rotation rate in rad/s */
    gyroY: number;
    /** Gyroscope Z-axis rotation rate in rad/s */
    gyroZ: number;
  };

  /** Latest vehicle OBD telemetry reading (Required) */
  vehicleData: {
    /** Vehicle OBD speed in km/h */
    speed: number;
    /** Engine speed in RPM */
    rpm: number;
    /** Engine load percentage (0 - 100%) */
    engineLoad?: number;
    /** Throttle position percentage (0 - 100%) */
    throttle?: number;
    /** Coolant temperature in °C */
    coolantTemp?: number;
    /** Battery/alternator voltage in V */
    batteryVoltage?: number;
    /** Active OBD Diagnostic Trouble Codes */
    diagnosticFaults: string[];
  };

  /** Latest device context reading (Optional) */
  deviceContext?: {
    /** Battery level percentage (0 to 100, or -1 if unreadable) */
    batteryLevel: number;
    /** True if device is plugged in and charging or full */
    isCharging: boolean;
    /** Current network connectivity state: WIFI, CELLULAR, NONE, or UNKNOWN */
    networkState: NetworkType;
  };

  /** Latest driver state / DMS telemetry reading (Optional) */
  driverState?: {
    /** PERCLOS percentage (0.0 to 100.0%) */
    perclos?: number;
    /** Primary gaze direction: FORWARD, LEFT, RIGHT, DOWN, UP, UNKNOWN */
    gazeDirection?: GazeDirection;
    /** Head orientation pose: NORMAL, TILTED_LEFT, TILTED_RIGHT, NODDING, UNKNOWN */
    headPose?: HeadPose;
    /** Driver attention state: FOCUSED, DROWSY, DISTRACTED, UNRESPONSIVE */
    attentionState?: AttentionState;
    /** Simulated blink rate in blinks per minute */
    blinkRate?: number;
    /** Simulated yawn detection flag */
    yawnDetected?: boolean;
  };
}

/**
 * Readiness status of the required sensor sources for unified telemetry emission.
 * Motion, Location, and Vehicle Data are required; Device Context and Driver State are optional.
 */
export interface TelemetryReadiness {
  /** True if at least one valid motion sensor reading has been captured */
  hasMotionData: boolean;
  /** True if at least one valid location GPS fix has been captured */
  hasLocationData: boolean;
  /** True if at least one valid vehicle telemetry reading has been captured */
  hasVehicleData: boolean;
  /** True when all three required sources (motion + location + vehicle) are active and ready */
  isReady: boolean;
}

/**
 * Configuration options for Complete Unified Telemetry Collection.
 */
export interface UnifiedTelemetryCollectorOptions {
  /** Update interval for motion sensors in milliseconds (Default: 200ms = 5 Hz) */
  motionUpdateIntervalMs?: number;
  /** Update interval for location sensor in milliseconds (Default: 1000ms = 1 Hz) */
  locationTimeIntervalMs?: number;
  /** Minimum distance change in meters required for location update (Default: 0 meters) */
  locationDistanceIntervalMeters?: number;
  /** Refresh interval for low-frequency device context updates in milliseconds (Default: 10000ms = 10s) */
  deviceContextRefreshIntervalMs?: number;
  /** Update interval for vehicle telemetry simulator in milliseconds (Default: 500ms = 2 Hz) */
  vehicleUpdateIntervalMs?: number;
  /** Initial vehicle simulation mode (Default: 'NORMAL') */
  vehicleSimulationMode?: VehicleSimulationMode;
  /** Update interval for driver state simulator in milliseconds (Default: 1000ms = 1 Hz) */
  driverStateUpdateIntervalMs?: number;
  /** Initial driver state simulation mode (Default: 'FOCUSED') */
  driverStateSimulationMode?: DriverStateSimulationMode;
  /** Emission interval in milliseconds for aggregated unified telemetry readings (Default: 200ms = 5 Hz) */
  emissionIntervalMs?: number;
}
