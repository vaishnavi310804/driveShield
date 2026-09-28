import { API_BASE_URL } from "../../config/api.config";
import { authenticatedFetch } from "../auth/apiClient";

export interface CreateDriverPayload {
  licenseNumber: string;
  phone: string;
  emergencyContact: {
    name: string;
    phone: string;
    relationship?: string;
  };
}

export const createDriverApi = async (
  payload: CreateDriverPayload
): Promise<{ success: boolean; message: string; data?: any }> => {
  try {
    const response = await authenticatedFetch(`${API_BASE_URL}/drivers`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (response.ok && data?.success) {
      return {
        success: true,
        message: data.message || "Driver profile created successfully.",
        data: data.data,
      };
    }

    return {
      success: false,
      message: data?.message || "Failed to create driver profile.",
    };
  } catch (error) {
    return {
      success: false,
      message: "Unable to connect to safety server. Please check your connection.",
    };
  }
};
