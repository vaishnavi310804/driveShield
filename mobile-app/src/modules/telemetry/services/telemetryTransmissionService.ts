import { API_BASE_URL } from '../../../config/api.config';
import { authenticatedFetch } from '../../auth/apiClient';
import {
  BackendTelemetryPayload,
  TelemetryTransmissionOptions,
  TransmissionStatus,
} from '../models/telemetryTransmission.types';
import { UnifiedTelemetryData } from '../models/unifiedTelemetry.types';

/**
 * Transforms a local UnifiedTelemetryData object into the exact BackendTelemetryPayload shape
 * expected by POST /api/telemetry.
 */
export function mapUnifiedTelemetryToBackendPayload(
  data: UnifiedTelemetryData,
  driverId: string,
  vehicleId: string
): BackendTelemetryPayload {
  const payload: BackendTelemetryPayload = {
    vehicleId,
    driverId,
    timestamp: data.timestamp,
    location: {
      latitude: data.location.latitude,
      longitude: data.location.longitude,
      speed: data.location.speed, // GPS speed
      ...(data.location.heading !== undefined ? { heading: data.location.heading } : {}),
    },
    motion: {
      accelX: data.motion.accelX,
      accelY: data.motion.accelY,
      accelZ: data.motion.accelZ,
      gForce: data.motion.gForce,
      gyroX: data.motion.gyroX,
      gyroY: data.motion.gyroY,
      gyroZ: data.motion.gyroZ,
    },
    vehicleData: {
      speed: data.vehicleData.speed, // Vehicle OBD speed (distinct from GPS speed)
      rpm: data.vehicleData.rpm,
      ...(data.vehicleData.engineLoad !== undefined ? { engineLoad: data.vehicleData.engineLoad } : {}),
      ...(data.vehicleData.throttle !== undefined ? { throttle: data.vehicleData.throttle } : {}),
      ...(data.vehicleData.coolantTemp !== undefined ? { coolantTemp: data.vehicleData.coolantTemp } : {}),
      ...(data.vehicleData.batteryVoltage !== undefined ? { batteryVoltage: data.vehicleData.batteryVoltage } : {}),
      diagnosticFaults: data.vehicleData.diagnosticFaults ?? [],
    },
  };

  if (data.deviceContext) {
    payload.deviceContext = {
      batteryLevel: data.deviceContext.batteryLevel,
      isCharging: data.deviceContext.isCharging,
      networkState: data.deviceContext.networkState,
    };
  }

  if (data.driverState) {
    payload.driverState = {
      ...(data.driverState.perclos !== undefined ? { perclos: data.driverState.perclos } : {}),
      ...(data.driverState.gazeDirection ? { gazeDirection: data.driverState.gazeDirection } : {}),
      ...(data.driverState.headPose ? { headPose: data.driverState.headPose } : {}),
      ...(data.driverState.attentionState ? { attentionState: data.driverState.attentionState } : {}),
    };
  }

  return payload;
}

/**
 * Mobile Telemetry Transmission Service.
 *
 * Transmits unified telemetry readings to POST /api/telemetry over HTTP.
 * Rate-limited via configurable transmission interval (default 1000ms / 1 Hz).
 */
export class TelemetryTransmissionService {
  private timer: ReturnType<typeof setInterval> | null = null;
  private isTransmitting: boolean = false;
  private isRequestInFlight: boolean = false;
  private status: TransmissionStatus = 'IDLE';
  private lastError: string | null = null;
  private lastSuccessTimestamp: string | null = null;

  getStatus(): TransmissionStatus {
    return this.status;
  }

  getLastError(): string | null {
    return this.lastError;
  }

  getLastSuccessTimestamp(): string | null {
    return this.lastSuccessTimestamp;
  }

  getIsTransmitting(): boolean {
    return this.isTransmitting;
  }

  /**
   * Sends a single telemetry reading immediately to POST /api/telemetry.
   */
  async sendTelemetry(
    data: UnifiedTelemetryData,
    driverId?: string,
    vehicleId?: string
  ): Promise<boolean> {
    if (!driverId) {
      this.status = 'ERROR';
      this.lastError = 'Driver profile is not linked.';
      return false;
    }

    if (!vehicleId) {
      this.status = 'ERROR';
      this.lastError = 'Vehicle profile is not linked.';
      return false;
    }

    if (this.isRequestInFlight) {
      return false; // Skip if a request is already in-flight
    }

    this.isRequestInFlight = true;
    this.status = 'SENDING';

    try {
      const payload = mapUnifiedTelemetryToBackendPayload(data, driverId, vehicleId);
      const res = await authenticatedFetch(`${API_BASE_URL}/telemetry`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorText = await res.text().catch(() => 'Unknown HTTP error');
        this.status = 'ERROR';
        this.lastError = `Backend HTTP ${res.status}: ${errorText}`;
        this.isRequestInFlight = false;
        return false;
      }

      this.status = 'SUCCESS';
      this.lastError = null;
      this.lastSuccessTimestamp = new Date().toISOString();
      this.isRequestInFlight = false;
      return true;
    } catch (err) {
      this.status = 'ERROR';
      this.lastError = err instanceof Error ? err.message : 'Network error';
      this.isRequestInFlight = false;
      return false;
    }
  }

  /**
   * Starts periodic transmission of latest unified telemetry.
   *
   * @param getLatestData - Callback returning latest UnifiedTelemetryData or null
   * @param options - Configurable transmission interval, driverId, vehicleId
   */
  start(
    getLatestData: () => UnifiedTelemetryData | null,
    options: TelemetryTransmissionOptions = {}
  ): void {
    if (this.isTransmitting) {
      this.stop();
    }

    const {
      transmissionIntervalMs = 1000,
      driverId,
      vehicleId,
    } = options;

    if (!driverId) {
      this.status = 'ERROR';
      this.lastError = 'Driver profile is not linked.';
      return;
    }

    if (!vehicleId) {
      this.status = 'ERROR';
      this.lastError = 'Vehicle profile is not linked.';
      return;
    }

    const validInterval = Math.max(200, transmissionIntervalMs);
    this.isTransmitting = true;
    this.status = 'IDLE';
    this.lastError = null;

    this.timer = setInterval(async () => {
      if (!this.isTransmitting) return;

      const latestData = getLatestData();
      if (!latestData) {
        return; // Skip tick if telemetry payload is not ready
      }

    }, validInterval);
  }

  /**
   * Stops periodic telemetry transmission and clears internal timer.
   */
  stop(): void {
    this.isTransmitting = false;

    if (this.timer !== null) {
      clearInterval(this.timer);
      this.timer = null;
    }

    this.status = 'IDLE';
  }
}
