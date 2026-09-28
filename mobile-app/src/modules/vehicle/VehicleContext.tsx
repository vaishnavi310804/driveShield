import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useAuth } from "../auth/AuthContext";
import { getMyVehicleApi } from "./vehicle.service";
import { VehicleData, VehicleStatus, VehicleContextType } from "./vehicle.types";

const VehicleContext = createContext<VehicleContextType | undefined>(undefined);

export const VehicleProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [vehicle, setVehicle] = useState<VehicleData | null>(null);
  const [status, setStatus] = useState<VehicleStatus>("LOADING");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchVehicle = useCallback(async () => {
    if (!user?.driverId) {
      setVehicle(null);
      setStatus("NOT_FOUND");
      setErrorMessage("Driver profile is not linked.");
      return;
    }

    setStatus("LOADING");
    setErrorMessage(null);

    const result = await getMyVehicleApi();

    if (result.success && result.data) {
      setVehicle(result.data);
      setStatus("AVAILABLE");
      setErrorMessage(null);
    } else if (result.status === 404) {
      setVehicle(null);
      setStatus("NOT_FOUND");
      setErrorMessage(result.message || "No active vehicle is registered.");
    } else {
      setVehicle(null);
      setStatus("ERROR");
      setErrorMessage(result.message || "Failed to resolve registered vehicle.");
    }
  }, [user?.driverId]);

  useEffect(() => {
    if (user) {
      fetchVehicle();
    } else {
      setVehicle(null);
      setStatus("NOT_FOUND");
      setErrorMessage(null);
    }
  }, [user, fetchVehicle]);

  const vehicleId = vehicle?._id || null;

  return (
    <VehicleContext.Provider
      value={{
        vehicle,
        vehicleId,
        status,
        errorMessage,
        refreshVehicle: fetchVehicle,
      }}
    >
      {children}
    </VehicleContext.Provider>
  );
};

export const useVehicle = (): VehicleContextType => {
  const context = useContext(VehicleContext);
  if (!context) {
    throw new Error("useVehicle must be used within a VehicleProvider");
  }
  return context;
};
