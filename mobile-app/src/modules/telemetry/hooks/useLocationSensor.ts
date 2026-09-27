import { useEffect, useRef, useState } from 'react';
import {
  LocationCollectorOptions,
  LocationPermissionStatus,
  LocationTelemetryData,
} from '../models/location.types';
import { LocationSensorCollector } from '../services/locationCollector';

export interface UseLocationSensorOptions extends LocationCollectorOptions {
  /**
   * Set to true to start location collection automatically if permission is granted.
   * Default: false
   */
  enabled?: boolean;
  /**
   * Set to true to automatically prompt for location permission on hook initialization.
   * Default: false
   */
  autoRequestPermission?: boolean;
}

export interface UseLocationSensorResult {
  /** Latest normalized GPS location telemetry data point */
  data: LocationTelemetryData | null;
  /** Current location permission/service status */
  permissionStatus: LocationPermissionStatus;
  /** True when location updates are actively being collected */
  isCollecting: boolean;
  /** Error message if location collection fails */
  error: string | null;
  /** Request location permissions from the device */
  requestPermissions: () => Promise<LocationPermissionStatus>;
  /** Manually start location collection */
  start: () => Promise<void>;
  /** Manually stop location collection */
  stop: () => void;
}

/**
 * Reusable React Hook for GPS / location sensor collection using expo-location.
 *
 * Handles permission states, continuous location updates, unit conversions (m/s to km/h),
 * and automatic cleanup on unmount.
 *
 * @param options - Configuration options (enabled, timeIntervalMs, distanceIntervalMeters, accuracy, autoRequestPermission)
 * @returns UseLocationSensorResult
 */
export function useLocationSensor(
  options: UseLocationSensorOptions = {}
): UseLocationSensorResult {
  const {
    enabled = false,
    autoRequestPermission = false,
    timeIntervalMs = 1000,
    distanceIntervalMeters = 0,
    accuracy,
  } = options;

  const collectorRef = useRef<LocationSensorCollector | null>(null);

  if (!collectorRef.current) {
    collectorRef.current = new LocationSensorCollector();
  }

  const [data, setData] = useState<LocationTelemetryData | null>(null);
  const [permissionStatus, setPermissionStatus] =
    useState<LocationPermissionStatus>('undetermined');
  const [isCollecting, setIsCollecting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Check initial permission status on mount
  useEffect(() => {
    let isMounted = true;

    collectorRef.current
      ?.checkPermissions()
      .then((status) => {
        if (!isMounted) return;
        setPermissionStatus(status);

        if (status === 'undetermined' && autoRequestPermission) {
          collectorRef.current
            ?.requestPermissions()
            .then((reqStatus) => {
              if (isMounted) setPermissionStatus(reqStatus);
            })
            .catch((err) => {
              if (isMounted) {
                setError(
                  err instanceof Error
                    ? err.message
                    : 'Permission request error'
                );
                setPermissionStatus('error');
              }
            });
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(
            err instanceof Error ? err.message : 'Permission check error'
          );
          setPermissionStatus('error');
        }
      });

    return () => {
      isMounted = false;
    };
  }, [autoRequestPermission]);

  const requestPermissions = async (): Promise<LocationPermissionStatus> => {
    try {
      setError(null);
      setPermissionStatus('requesting');
      const status =
        (await collectorRef.current?.requestPermissions()) ?? 'error';
      setPermissionStatus(status);
      return status;
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'Failed to request permissions';
      setError(msg);
      setPermissionStatus('error');
      return 'error';
    }
  };

  const startCollection = async () => {
    try {
      setError(null);
      await collectorRef.current?.start(
        (newData) => {
          setData(newData);
        },
        { timeIntervalMs, distanceIntervalMeters, accuracy }
      );
      setIsCollecting(true);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to start location collection'
      );
      setIsCollecting(false);
    }
  };

  const stopCollection = () => {
    collectorRef.current?.stop();
    setIsCollecting(false);
  };

  // Lifecycle control via `enabled`, `timeIntervalMs`, `distanceIntervalMeters`, `accuracy`
  useEffect(() => {
    if (enabled && permissionStatus === 'granted') {
      startCollection();
    } else {
      stopCollection();
    }

    return () => {
      stopCollection();
    };
  }, [enabled, permissionStatus, timeIntervalMs, distanceIntervalMeters, accuracy]);

  return {
    data,
    permissionStatus,
    isCollecting,
    error,
    requestPermissions,
    start: startCollection,
    stop: stopCollection,
  };
}
