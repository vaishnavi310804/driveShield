import * as SecureStore from "expo-secure-store";

const TOKEN_KEY = "auth_token";

let inMemoryToken: string | null = null;

export const saveToken = async (token: string): Promise<void> => {
  try {
    inMemoryToken = token;
    const isAvailable = await SecureStore.isAvailableAsync().catch(() => false);
    if (isAvailable) {
      await SecureStore.setItemAsync(TOKEN_KEY, token);
      return;
    }
    if (typeof window !== "undefined" && window.localStorage) {
      window.localStorage.setItem(TOKEN_KEY, token);
    }
  } catch (error) {
    console.error("SecureStore saveToken error:", error);
  }
};

export const getToken = async (): Promise<string | null> => {
  try {
    const isAvailable = await SecureStore.isAvailableAsync().catch(() => false);
    if (isAvailable) {
      const stored = await SecureStore.getItemAsync(TOKEN_KEY);
      if (stored) return stored;
    }
    if (typeof window !== "undefined" && window.localStorage) {
      const webToken = window.localStorage.getItem(TOKEN_KEY);
      if (webToken) return webToken;
    }
    return inMemoryToken;
  } catch (error) {
    console.error("SecureStore getToken error:", error);
    return inMemoryToken;
  }
};

export const clearToken = async (): Promise<void> => {
  try {
    inMemoryToken = null;
    const isAvailable = await SecureStore.isAvailableAsync().catch(() => false);
    if (isAvailable) {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
    }
    if (typeof window !== "undefined" && window.localStorage) {
      window.localStorage.removeItem(TOKEN_KEY);
    }
  } catch (error) {
    console.error("SecureStore clearToken error:", error);
  }
};
