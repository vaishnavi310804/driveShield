import { useEffect, useRef, useState } from 'react';
import {
  VehicleSimulationMode,
  VehicleSimulatorOptions,
  VehicleTelemetryData,
} from '../models/vehicle.types';
import { VehicleTelemetrySimulator } from '../services/vehicleTelemetrySimulator';

export interface UseVehicleTelemetrySimulatorOptions
  extends VehicleSimulatorOptions {
  /**
   * Set to true to start the vehicle telemetry simulator automatically.
   * Default: false
   */
  enabled?: boolean;
}

export interface UseVehicleTelemetrySimulatorResult {
  /** Latest vehicle telemetry data point */
  data: VehicleTelemetryData | null;
  /** Active simulation mode ('NORMAL' | 'STALL' | 'CRITICAL_PARAMETER') */
  mode: VehicleSimulationMode;
  /** True when simulator is actively running */
  isRunning: boolean;
  /** Error message if simulator fails */
  error: string | null;
  /** Change simulation mode dynamically */
  setMode: (mode: VehicleSimulationMode) => void;
  /** Manually start the vehicle simulator */
  start: () => void;
  /** Manually stop the vehicle simulator */
  stop: () => void;
}

/**
 * Reusable React Hook for Vehicle / OBD Telemetry Simulation.
 *
 * Manages vehicle simulation lifecycle, deterministic mode switching,
 * and automatic cleanup on unmount.
 *
 * @param options - Configuration options (enabled, mode, updateIntervalMs)
 * @returns UseVehicleTelemetrySimulatorResult
 */
export function useVehicleTelemetrySimulator(
  options: UseVehicleTelemetrySimulatorOptions = {}
): UseVehicleTelemetrySimulatorResult {
  const {
    enabled = false,
    mode: initialMode = 'NORMAL',
    updateIntervalMs = 500,
  } = options;

  const simulatorRef = useRef<VehicleTelemetrySimulator | null>(null);

  if (!simulatorRef.current) {
    simulatorRef.current = new VehicleTelemetrySimulator(initialMode);
  }

  const [data, setData] = useState<VehicleTelemetryData | null>(null);
  const [mode, setModeState] = useState<VehicleSimulationMode>(initialMode);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const setMode = (newMode: VehicleSimulationMode) => {
    setModeState(newMode);
    if (simulatorRef.current) {
      simulatorRef.current.setMode(newMode);
    }
  };

  const startSimulation = () => {
    try {
      setError(null);
      simulatorRef.current?.start(
        (newData) => {
          setData(newData);
        },
        { mode, updateIntervalMs }
      );
      setIsRunning(true);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to start vehicle simulator'
      );
      setIsRunning(false);
    }
  };

  const stopSimulation = () => {
    simulatorRef.current?.stop();
    setIsRunning(false);
  };

  // Lifecycle control
  useEffect(() => {
    if (enabled) {
      startSimulation();
    } else {
      stopSimulation();
    }

    return () => {
      stopSimulation();
    };
  }, [enabled, mode, updateIntervalMs]);

  return {
    data,
    mode,
    isRunning,
    error,
    setMode,
    start: startSimulation,
    stop: stopSimulation,
  };
}
