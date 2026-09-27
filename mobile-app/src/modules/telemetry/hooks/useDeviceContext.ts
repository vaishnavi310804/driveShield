import { useEffect, useRef, useState } from 'react';
import {
  DeviceContextAvailability,
  DeviceContextCollectorOptions,
  DeviceContextTelemetryData,
} from '../models/deviceContext.types';
import { DeviceContextCollector } from '../services/deviceContextCollector';

export interface UseDeviceContextOptions
  extends DeviceContextCollectorOptions {
  /**
   * Set to true to start collecting device context data automatically.
   * Default: false
   */
  enabled?: boolean;
}

export interface UseDeviceContextResult {
  /** Latest normalized device context telemetry data */
  data: DeviceContextTelemetryData | null;
  /** Hardware availability status for battery and network APIs */
  availability: DeviceContextAvailability | null;
  /** True when device context collection is active */
  isCollecting: boolean;
  /** Error message if device context collection fails */
  error: string | null;
  /** Manually start collecting device context telemetry */
  start: () => Promise<void>;
  /** Manually stop collecting device context telemetry */
  stop: () => void;
}

/**
 * Reusable React Hook for device context telemetry collection (battery & network state).
 *
 * Listens for battery changes via event listeners and polls network connectivity low-frequency.
 * Handles state management, availability checks, and automatic cleanup on unmount.
 *
 * @param options - Configuration options (enabled, refreshIntervalMs)
 * @returns UseDeviceContextResult
 */
export function useDeviceContext(
  options: UseDeviceContextOptions = {}
): UseDeviceContextResult {
  const { enabled = false, refreshIntervalMs = 10000 } = options;

  const collectorRef = useRef<DeviceContextCollector | null>(null);

  if (!collectorRef.current) {
    collectorRef.current = new DeviceContextCollector();
  }

  const [data, setData] = useState<DeviceContextTelemetryData | null>(null);
  const [availability, setAvailability] =
    useState<DeviceContextAvailability | null>(null);
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
            err instanceof Error
              ? err.message
              : 'Device context availability error'
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
        { refreshIntervalMs }
      );
      setIsCollecting(true);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to start device context collection'
      );
      setIsCollecting(false);
    }
  };

  const stopCollection = () => {
    collectorRef.current?.stop();
    setIsCollecting(false);
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
  }, [enabled, refreshIntervalMs]);

  return {
    data,
    availability,
    isCollecting,
    error,
    start: startCollection,
    stop: stopCollection,
  };
}
