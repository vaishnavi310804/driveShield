import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../auth/AuthContext';
import { useVehicle } from '../vehicle/VehicleContext';
import { useUnifiedTelemetry } from './hooks/useUnifiedTelemetry';
import { useTelemetryTransmission } from './hooks/useTelemetryTransmission';
import {
  DriverStateSimulationMode,
  TelemetryReadiness,
  TransmissionStatus,
  UnifiedTelemetryData,
  VehicleSimulationMode,
} from './index';
import { API_BASE_URL } from '../../config/api.config';
import { authenticatedFetch } from '../auth/apiClient';

export type BaselineStatus = 'ESTABLISHING' | 'READY' | 'UNAVAILABLE';

export interface TelemetryContextType {
  telemetryData: UnifiedTelemetryData | null;
  readiness: TelemetryReadiness;
  isCollecting: boolean;
  isTransmitting: boolean;
  transmissionStatus: TransmissionStatus;
  lastSuccessTimestamp: string | null;
  vehicleSimulationMode: VehicleSimulationMode;
  driverStateSimulationMode: DriverStateSimulationMode;
  setVehicleSimulationMode: (mode: VehicleSimulationMode) => void;
  setDriverStateSimulationMode: (mode: DriverStateSimulationMode) => void;
  baselineStatus: BaselineStatus;
  refreshBaselineStatus: () => Promise<void>;
}

const TelemetryContext = createContext<TelemetryContextType | undefined>(undefined);

export const TelemetryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const { vehicleId } = useVehicle();

  const [baselineStatus, setBaselineStatus] = useState<BaselineStatus>('ESTABLISHING');

  const {
    data: telemetryData,
    readiness,
    isCollecting,
    vehicleSimulationMode,
    driverStateSimulationMode,
    setVehicleSimulationMode,
    setDriverStateSimulationMode,
  } = useUnifiedTelemetry({
    enabled: Boolean(user?.driverId && vehicleId),
    motionUpdateIntervalMs: 200,
    locationTimeIntervalMs: 1000,
    vehicleUpdateIntervalMs: 500,
    driverStateUpdateIntervalMs: 1000,
    emissionIntervalMs: 200,
  });

  const telemetryDataRef = useRef(telemetryData);
  telemetryDataRef.current = telemetryData;

  const {
    status: transmissionStatus,
    isTransmitting,
    lastSuccessTimestamp,
    start: startTransmission,
    stop: stopTransmission,
  } = useTelemetryTransmission({
    transmissionIntervalMs: 1000,
    driverId: user?.driverId || undefined,
    vehicleId: vehicleId || undefined,
  });

  useEffect(() => {
    if (user?.driverId && vehicleId) {
      startTransmission(() => telemetryDataRef.current);
    } else {
      stopTransmission();
    }
  }, [user?.driverId, vehicleId]);

  const checkBaselineStatus = useCallback(async () => {
    if (!user?.driverId || !vehicleId) {
      setBaselineStatus('ESTABLISHING');
      return;
    }

    try {
      const res = await authenticatedFetch(
        `${API_BASE_URL}/baselines?driverId=${user.driverId}&vehicleId=${vehicleId}`,
        { method: 'GET' }
      );
      if (res.ok) {
        const json = await res.json();
        if (json?.success && json?.data?._id) {
          setBaselineStatus('READY');
          return;
        }
      }
      setBaselineStatus('ESTABLISHING');
    } catch {
      setBaselineStatus('ESTABLISHING');
    }
  }, [user?.driverId, vehicleId]);

  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null;
    if (user?.driverId && vehicleId) {
      checkBaselineStatus();
      timer = setInterval(() => {
        checkBaselineStatus();
      }, 2000);
    } else {
      setBaselineStatus('ESTABLISHING');
    }

    return () => {
      if (timer) clearInterval(timer);
    };
  }, [user?.driverId, vehicleId, checkBaselineStatus]);

  return (
    <TelemetryContext.Provider
      value={{
        telemetryData,
        readiness,
        isCollecting,
        isTransmitting,
        transmissionStatus,
        lastSuccessTimestamp,
        vehicleSimulationMode,
        driverStateSimulationMode,
        setVehicleSimulationMode,
        setDriverStateSimulationMode,
        baselineStatus,
        refreshBaselineStatus: checkBaselineStatus,
      }}
    >
      {children}
    </TelemetryContext.Provider>
  );
};

export const useTelemetryContext = (): TelemetryContextType => {
  const context = useContext(TelemetryContext);
  if (!context) {
    throw new Error('useTelemetryContext must be used within a TelemetryProvider');
  }
  return context;
};
