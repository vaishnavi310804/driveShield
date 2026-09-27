/**
 * Data contracts for Driver State / Driver Monitoring System (DMS) Telemetry.
 */

export type GazeDirection = 'FORWARD' | 'LEFT' | 'RIGHT' | 'DOWN' | 'UP' | 'UNKNOWN';
export type HeadPose = 'NORMAL' | 'TILTED_LEFT' | 'TILTED_RIGHT' | 'NODDING' | 'UNKNOWN';
export type AttentionState = 'FOCUSED' | 'DROWSY' | 'DISTRACTED' | 'UNRESPONSIVE';

/**
 * Normalized Driver State / DMS Telemetry Data object matching backend schema.
 */
export interface DriverStateTelemetryData {
  /** PERCLOS (Percentage of Eye Closure over time) from 0.0 to 100.0 % */
  perclos?: number;
  /** Primary gaze direction: FORWARD, LEFT, RIGHT, DOWN, UP, or UNKNOWN */
  gazeDirection?: GazeDirection;
  /** Head orientation pose: NORMAL, TILTED_LEFT, TILTED_RIGHT, NODDING, or UNKNOWN */
  headPose?: HeadPose;
  /** Driver attention state: FOCUSED, DROWSY, DISTRACTED, or UNRESPONSIVE */
  attentionState?: AttentionState;
  /** Optional simulated blink rate in blinks per minute */
  blinkRate?: number;
  /** Optional simulated yawn detection flag */
  yawnDetected?: boolean;
  /** ISO 8601 UTC timestamp of the telemetry observation */
  timestamp: string;
}

/**
 * Deterministic simulation mode for DriverStateSimulator.
 */
export type DriverStateSimulationMode =
  | 'FOCUSED'
  | 'DROWSY'
  | 'DISTRACTED'
  | 'UNRESPONSIVE';

/**
 * Configuration options for DriverStateSimulator.
 */
export interface DriverStateSimulatorOptions {
  /** Initial simulation mode (default: 'FOCUSED') */
  mode?: DriverStateSimulationMode;
  /** Update interval in milliseconds (default: 1000ms = 1 Hz) */
  updateIntervalMs?: number;
}
