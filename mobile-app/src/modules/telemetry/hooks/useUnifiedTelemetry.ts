import { useEffect, useRef, useState } from 'react';
import { DriverStateSimulationMode } from '../models/driverState.types';
import {
  TelemetryReadiness,
  UnifiedTelemetryCollectorOptions,
  UnifiedTelemetryData,
} from '../models/unifiedTelemetry.types';
import { VehicleSimulationMode } from '../models/vehicle.types';
import { UnifiedTelemetryAggregator } from '../services/unifiedTelemetryAggregator';

export interface UseUnifiedTelemetryOptions
  extends UnifiedTelemetryCollectorOptions {
  /**
   * Set to true to automatically start aggregating telemetry.
   * Default: false
   */
  enabled?: boolean;
}

export interface UseUnifiedTelemetryResult {
  /** Latest unified mobile telemetry object */
  data: UnifiedTelemetryData | null;
  /** Sensor input readiness status (motion + location + vehicle) */
  readiness: TelemetryReadiness;
  /** True when telemetry collection and aggregation are actively running */
  isCollecting: boolean;
  /** Error message if aggregation initialization fails */
  error: string | null;
  /** Currently active vehicle simulation mode */
  vehicleSimulationMode: VehicleSimulationMode;
  /** Currently active driver state simulation mode */
  driverStateSimulationMode: DriverStateSimulationMode;
  /** Change vehicle simulation mode dynamically */
  setVehicleSimulationMode: (mode: VehicleSimulationMode) => void;
  /** Change driver state simulation mode dynamically */
  setDriverStateSimulationMode: (mode: DriverStateSimulationMode) => void;
  /** Manually start unified telemetry collection */
  start: () => Promise<void>;
  /** Manually stop unified telemetry collection */
  stop: () => void;
}

/**
 * Reusable React Hook for Complete Unified Mobile Telemetry Aggregation.
 *
 * Automatically manages Motion, Location, Device Context, Vehicle Simulator,
 * and Driver State Simulator lifecycles, aggregates latest values, monitors readiness,
 * exposes runtime simulation mode setters, and handles cleanup on unmount.
 *
 * @param options - Configurable intervals, simulation modes, and enabled status
 * @returns UseUnifiedTelemetryResult
 */
export function useUnifiedTelemetry(
  options: UseUnifiedTelemetryOptions = {}
): UseUnifiedTelemetryResult {
  const {
    enabled = false,
    motionUpdateIntervalMs = 200,
    locationTimeIntervalMs = 1000,
    locationDistanceIntervalMeters = 0,
    deviceContextRefreshIntervalMs = 10000,
    vehicleUpdateIntervalMs = 500,
    vehicleSimulationMode: initialVehicleMode = 'NORMAL',
    driverStateUpdateIntervalMs = 1000,
    driverStateSimulationMode: initialDriverMode = 'FOCUSED',
    emissionIntervalMs = 200,
  } = options;

  const aggregatorRef = useRef<UnifiedTelemetryAggregator | null>(null);

  if (!aggregatorRef.current) {
    aggregatorRef.current = new UnifiedTelemetryAggregator();
  }

  const [data, setData] = useState<UnifiedTelemetryData | null>(null);
  const [readiness, setReadiness] = useState<TelemetryReadiness>({
    hasMotionData: false,
    hasLocationData: false,
    hasVehicleData: false,
    isReady: false,
  });
  const [isCollecting, setIsCollecting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [vehicleSimulationMode, setVehicleModeState] =
    useState<VehicleSimulationMode>(initialVehicleMode);
  const [driverStateSimulationMode, setDriverModeState] =
    useState<DriverStateSimulationMode>(initialDriverMode);

  const setVehicleSimulationMode = (mode: VehicleSimulationMode) => {
    setVehicleModeState(mode);
    if (aggregatorRef.current) {
      aggregatorRef.current.setVehicleSimulationMode(mode);
    }
  };

  const setDriverStateSimulationMode = (mode: DriverStateSimulationMode) => {
    setDriverModeState(mode);
    if (aggregatorRef.current) {
      aggregatorRef.current.setDriverStateSimulationMode(mode);
    }
  };

  const startCollection = async () => {
    try {
      setError(null);
      await aggregatorRef.current?.start(
        (unifiedPayload) => {
          setData(unifiedPayload);
          if (aggregatorRef.current) {
            setReadiness(aggregatorRef.current.getReadiness());
          }
        },
        {
          motionUpdateIntervalMs,
          locationTimeIntervalMs,
          locationDistanceIntervalMeters,
          deviceContextRefreshIntervalMs,
          vehicleUpdateIntervalMs,
          vehicleSimulationMode,
          driverStateUpdateIntervalMs,
          driverStateSimulationMode,
          emissionIntervalMs,
        }
      );
      setIsCollecting(true);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to start unified telemetry collection'
      );
      setIsCollecting(false);
    }
  };

  const stopCollection = () => {
    aggregatorRef.current?.stop();
    setIsCollecting(false);
    setReadiness({
      hasMotionData: false,
      hasLocationData: false,
      hasVehicleData: false,
      isReady: false,
    });
  };

  // Lifecycle management
  useEffect(() => {
    if (enabled) {
      startCollection();
    } else {
      stopCollection();
    }

    return () => {
      stopCollection();
    };
  }, [
    enabled,
    motionUpdateIntervalMs,
    locationTimeIntervalMs,
    locationDistanceIntervalMeters,
    deviceContextRefreshIntervalMs,
    vehicleUpdateIntervalMs,
    driverStateUpdateIntervalMs,
    emissionIntervalMs,
  ]);

  return {
    data,
    readiness,
    isCollecting,
    error,
    vehicleSimulationMode,
    driverStateSimulationMode,
    setVehicleSimulationMode,
    setDriverStateSimulationMode,
    start: startCollection,
    stop: stopCollection,
  };
}
