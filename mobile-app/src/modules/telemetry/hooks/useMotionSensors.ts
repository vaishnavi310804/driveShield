import { useEffect, useRef, useState } from 'react';
import {
  MotionTelemetryData,
  SensorAvailability,
  SensorCollectorOptions,
} from '../models/sensor.types';
import { MotionSensorCollector } from '../services/sensorCollector';

export interface UseMotionSensorsOptions extends SensorCollectorOptions {
  /**
   * Set to true to start collecting sensor data automatically.
   * Default: false
   */
  enabled?: boolean;
}

export interface UseMotionSensorsResult {
  /** Latest normalized motion telemetry data point */
  data: MotionTelemetryData | null;
  /** Sensor availability status on current hardware */
  availability: SensorAvailability | null;
  /** True when sensors are currently actively sampling */
  isCollecting: boolean;
  /** Error message if sensor initialization fails */
  error: string | null;
  /** Manually start collecting sensor data */
  start: () => Promise<void>;
  /** Manually stop collecting sensor data */
  stop: () => void;
}

/**
 * Reusable React Hook for smartphone motion sensor collection (Accelerometer & Gyroscope).
 *
 * Handles sensor lifecycle, state management, permission/availability checks,
 * and automatic cleanup on component unmount.
 *
 * @param options - Configuration options (enabled, updateIntervalMs)
 * @returns UseMotionSensorsResult
 */
export function useMotionSensors(
  options: UseMotionSensorsOptions = {}
): UseMotionSensorsResult {
  const { enabled = false, updateIntervalMs = 200 } = options;

  const collectorRef = useRef<MotionSensorCollector | null>(null);

  if (!collectorRef.current) {
    collectorRef.current = new MotionSensorCollector();
  }

  const [data, setData] = useState<MotionTelemetryData | null>(null);
  const [availability, setAvailability] = useState<SensorAvailability | null>(
    null
  );
  const [isCollecting, setIsCollecting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Check hardware availability on mount
  useEffect(() => {
    let isMounted = true;

    collectorRef.current
      ?.checkAvailability()
      .then((status) => {
        if (isMounted) {
          setAvailability(status);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(
            err instanceof Error ? err.message : 'Sensor availability error'
          );
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const startCollection = async () => {
    try {
      setError(null);
      await collectorRef.current?.start(
        (newData) => {
          setData(newData);
        },
        { updateIntervalMs }
      );
      setIsCollecting(true);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to start motion sensor collection'
      );
      setIsCollecting(false);
    }
  };

  const stopCollection = () => {
    collectorRef.current?.stop();
    setIsCollecting(false);
  };

  // Lifecycle control via `enabled` prop & updateIntervalMs changes
  useEffect(() => {
    if (enabled) {
      startCollection();
    } else {
      stopCollection();
    }

    return () => {
      stopCollection();
    };
  }, [enabled, updateIntervalMs]);

  return {
    data,
    availability,
    isCollecting,
    error,
    start: startCollection,
    stop: stopCollection,
  };
}
