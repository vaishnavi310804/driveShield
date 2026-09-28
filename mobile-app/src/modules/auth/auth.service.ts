import { API_BASE_URL } from "../../config/api.config";
import { UserProfile } from "./auth.types";


export const loginApi = async (
  email: string,
  password: string
): Promise<{ success: boolean; message: string; token?: string; user?: any }> => {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: email.trim(),
        password,
      }),
    });

    const data = await response.json();

    if (response.ok && data?.success) {
      return {
        success: true,
        message: data.message || "Login successful",
        token: data.token,
        user: data.user,
      };
    }

    return {
      success: false,
      message: data?.message || "Invalid email or password.",
    };
  } catch (error) {
    return {
      success: false,
      message: "Unable to connect to authentication server. Please check your connection.",
    };
  }
};

export const fetchMeApi = async (
  token: string
): Promise<{ success: boolean; user?: UserProfile; message?: string }> => {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/me`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    const data = await response.json();

    if (response.ok && data?.success && data?.data) {
      return {
        success: true,
        user: {
          id: data.data.id,
          fullName: data.data.fullName,
          email: data.data.email,
          driverId: data.data.driverId || null,
        },
      };
    }

    return {
      success: false,
      message: data?.message || "Session expired or invalid.",
    };
  } catch (error) {
    return {
      success: false,
      message: "Network error fetching user profile.",
    };
  }
};

export const registerApi = async (
  fullName: string,
  email: string,
  password: string
): Promise<{ success: boolean; message: string; token?: string; user?: any }> => {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        fullName: fullName.trim(),
        email: email.trim(),
        password,
      }),
    });

    const data = await response.json();

    if (response.ok && data?.success) {
      return {
        success: true,
        message: data.message || "Registration successful",
        token: data.token,
        user: data.user,
      };
    }

    return {
      success: false,
      message: data?.message || "Registration failed. Please check your inputs.",
    };
  } catch (error) {
    return {
      success: false,
      message: "Unable to connect to authentication server. Please check your connection.",
    };
  }
};
