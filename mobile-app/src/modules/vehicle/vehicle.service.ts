import { API_BASE_URL } from "../../config/api.config";
import { authenticatedFetch } from "../auth/apiClient";
import { VehicleData } from "./vehicle.types";

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
