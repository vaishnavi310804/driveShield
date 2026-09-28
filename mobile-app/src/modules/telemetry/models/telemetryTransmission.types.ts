import { NetworkType } from './deviceContext.types';
import { AttentionState, GazeDirection, HeadPose } from './driverState.types';

/**
 * Transmission status lifecycle state.
 */
export type TransmissionStatus = 'IDLE' | 'SENDING' | 'SUCCESS' | 'ERROR';

/**
 * Backend Telemetry Ingestion Payload contract expected by POST /api/telemetry.
 */
export interface BackendTelemetryPayload {
  /** 24-character hexadecimal MongoDB ObjectId for vehicle */
  vehicleId: string;
  /** 24-character hexadecimal MongoDB ObjectId for driver */
  driverId: string;
  /** ISO 8601 UTC timestamp */
  timestamp: string;

  /** Location data (GPS speed) */
  location: {
    latitude: number;
    longitude: number;
    speed: number;
    heading?: number;
  };

  /** 3-axis motion and G-force readings */
  motion: {
    accelX: number;
    accelY: number;
    accelZ: number;
    gForce: number;
    gyroX: number;
    gyroY: number;
    gyroZ: number;
  };

  /** Vehicle OBD telemetry (OBD speed) */
  vehicleData: {
    speed: number;
    rpm: number;
    engineLoad?: number;
    throttle?: number;
    coolantTemp?: number;
    batteryVoltage?: number;
    diagnosticFaults: string[];
  };

  /** Optional device context */
  deviceContext?: {
    batteryLevel: number;
    isCharging: boolean;
    networkState: NetworkType;
  };

  /** Optional driver state / DMS data */
  driverState?: {
    perclos?: number;
    gazeDirection?: GazeDirection;
    headPose?: HeadPose;
    attentionState?: AttentionState;
  };
}

/**
 * Configuration options for TelemetryTransmissionService.
 */
export interface TelemetryTransmissionOptions {
  /** Transmission interval in milliseconds (default: 1000ms = 1 Hz) */
  transmissionIntervalMs?: number;
  /** Driver ObjectId of authenticated driver */
  driverId?: string;
  /** Vehicle ObjectId of authenticated user vehicle */
  vehicleId?: string;
}
