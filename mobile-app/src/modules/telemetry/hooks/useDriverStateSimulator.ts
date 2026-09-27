import { useEffect, useRef, useState } from 'react';
import {
  DriverStateSimulationMode,
  DriverStateSimulatorOptions,
  DriverStateTelemetryData,
} from '../models/driverState.types';
import { DriverStateSimulator } from '../services/driverStateSimulator';

export interface UseDriverStateSimulatorOptions
  extends DriverStateSimulatorOptions {
  /**
   * Set to true to start the driver state simulator automatically.
   * Default: false
   */
  enabled?: boolean;
}

export interface UseDriverStateSimulatorResult {
  /** Latest driver state telemetry data point */
  data: DriverStateTelemetryData | null;
  /** Active simulation mode ('FOCUSED' | 'DROWSY' | 'DISTRACTED' | 'UNRESPONSIVE') */
  mode: DriverStateSimulationMode;
  /** True when simulator is actively running */
  isRunning: boolean;
  /** Error message if simulator fails */
  error: string | null;
  /** Change simulation mode dynamically */
  setMode: (mode: DriverStateSimulationMode) => void;
  /** Manually start the driver state simulator */
  start: () => void;
  /** Manually stop the driver state simulator */
  stop: () => void;
}

/**
 * Reusable React Hook for Driver State / DMS Telemetry Simulation.
 *
 * Manages simulation lifecycle, mode switching (FOCUSED, DROWSY, DISTRACTED, UNRESPONSIVE),
 * and automatic cleanup on unmount.
 *
 * @param options - Configuration options (enabled, mode, updateIntervalMs)
 * @returns UseDriverStateSimulatorResult
 */
export function useDriverStateSimulator(
  options: UseDriverStateSimulatorOptions = {}
): UseDriverStateSimulatorResult {
  const {
    enabled = false,
    mode: initialMode = 'FOCUSED',
    updateIntervalMs = 1000,
  } = options;

  const simulatorRef = useRef<DriverStateSimulator | null>(null);

  if (!simulatorRef.current) {
    simulatorRef.current = new DriverStateSimulator(initialMode);
  }

  const [data, setData] = useState<DriverStateTelemetryData | null>(null);
  const [mode, setModeState] = useState<DriverStateSimulationMode>(initialMode);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const setMode = (newMode: DriverStateSimulationMode) => {
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
        err instanceof Error ? err.message : 'Failed to start driver state simulator'
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
