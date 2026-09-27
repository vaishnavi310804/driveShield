import { useEffect, useRef, useState } from 'react';
import {
  TelemetryTransmissionOptions,
  TransmissionStatus,
} from '../models/telemetryTransmission.types';
import { UnifiedTelemetryData } from '../models/unifiedTelemetry.types';
import { TelemetryTransmissionService } from '../services/telemetryTransmissionService';

export interface UseTelemetryTransmissionOptions
  extends TelemetryTransmissionOptions {
  /**
   * Set to true to start transmission automatically when started with getLatestData.
   * Default: false
   */
  enabled?: boolean;
}

export interface UseTelemetryTransmissionResult {
  /** Current transmission status: 'IDLE' | 'SENDING' | 'SUCCESS' | 'ERROR' */
  status: TransmissionStatus;
  /** True when periodic transmission is running */
  isTransmitting: boolean;
  /** Error message if transmission fails */
  error: string | null;
  /** Timestamp of last successful transmission */
  lastSuccessTimestamp: string | null;
  /** Manually send a single unified telemetry reading */
  sendNow: (data: UnifiedTelemetryData) => Promise<boolean>;
  /** Start periodic transmission driven by getLatestData */
  start: (getLatestData: () => UnifiedTelemetryData | null) => void;
  /** Stop periodic transmission and clear interval timer */
  stop: () => void;
}

/**
 * Reusable React Hook for mobile telemetry transmission to backend.
 *
 * Manages periodic HTTP POST transmission to /api/telemetry, exposes status/error,
 * and handles cleanup on unmount.
 *
 * @param options - Transmission interval, driverId, vehicleId, enabled
 * @returns UseTelemetryTransmissionResult
 */
export function useTelemetryTransmission(
  options: UseTelemetryTransmissionOptions = {}
): UseTelemetryTransmissionResult {
  const {
    transmissionIntervalMs = 1000,
    driverId,
    vehicleId,
  } = options;

  const serviceRef = useRef<TelemetryTransmissionService | null>(null);

  if (!serviceRef.current) {
    serviceRef.current = new TelemetryTransmissionService();
  }

  const [status, setStatus] = useState<TransmissionStatus>('IDLE');
  const [isTransmitting, setIsTransmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSuccessTimestamp, setLastSuccessTimestamp] = useState<string | null>(null);

  const sendNow = async (data: UnifiedTelemetryData): Promise<boolean> => {
    if (!serviceRef.current) return false;
    const success = await serviceRef.current.sendTelemetry(data, driverId, vehicleId);
    setStatus(serviceRef.current.getStatus());
    setError(serviceRef.current.getLastError());
    setLastSuccessTimestamp(serviceRef.current.getLastSuccessTimestamp());
    return success;
  };

  const startTransmission = (getLatestData: () => UnifiedTelemetryData | null) => {
    if (!serviceRef.current) return;
    serviceRef.current.start(getLatestData, {
      transmissionIntervalMs,
      driverId,
      vehicleId,
    });
    setIsTransmitting(true);
    setStatus(serviceRef.current.getStatus());
  };

  const stopTransmission = () => {
    if (!serviceRef.current) return;
    serviceRef.current.stop();
    setIsTransmitting(false);
    setStatus('IDLE');
  };

  useEffect(() => {
    return () => {
      stopTransmission();
    };
  }, []);

  return {
    status,
    isTransmitting,
    error,
    lastSuccessTimestamp,
    sendNow,
    start: startTransmission,
    stop: stopTransmission,
  };
}
