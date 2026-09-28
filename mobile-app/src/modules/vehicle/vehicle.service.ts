import { API_BASE_URL } from "../../config/api.config";
import { authenticatedFetch } from "../auth/apiClient";
import { VehicleData } from "./vehicle.types";

export interface CreateVehiclePayload {
  make: string;
  model: string;
  year: number;
  licensePlate: string;
  vehicleType: string;
  color?: string;
}

export const getMyVehicleApi = async (): Promise<{
  success: boolean;
  data?: VehicleData;
  message?: string;
  status?: number;
}> => {
  try {
    const response = await authenticatedFetch(`${API_BASE_URL}/vehicles/me`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    const data = await response.json();

    if (response.ok && data?.success && data?.data) {
      return {
        success: true,
        data: data.data,
        status: response.status,
      };
    }

    return {
      success: false,
      message: data?.message || "Unable to resolve active vehicle.",
      status: response.status,
    };
  } catch (error) {
    return {
      success: false,
      message: "Network error resolving active vehicle profile.",
    };
  }
};

export const createVehicleApi = async (
  payload: CreateVehiclePayload
): Promise<{ success: boolean; data?: VehicleData; message?: string }> => {
  try {
    const response = await authenticatedFetch(`${API_BASE_URL}/vehicles`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (response.ok && data?.success && data?.data) {
      return {
        success: true,
        data: data.data,
        message: data.message || "Vehicle registered successfully.",
      };
    }

    return {
      success: false,
      message: data?.message || "Failed to register vehicle.",
    };
  } catch (error) {
    return {
      success: false,
      message: "Unable to connect to safety server. Please check your connection.",
    };
  }
};
