import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { AuthContextType, AuthState, UserProfile } from "./auth.types";
import { saveToken, getToken, clearToken } from "./auth.storage";
import { loginApi, registerApi, fetchMeApi } from "./auth.service";

const initialAuthState: AuthState = {
  isLoading: true,
  isAuthenticated: false,
  token: null,
  user: null,
};

const AuthContext = createContext<AuthContextType>({
  ...initialAuthState,
  login: async () => ({ success: false, message: "" }),
  register: async () => ({ success: false, message: "" }),
  logout: async () => {},
  restoreSession: async () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [authState, setAuthState] = useState<AuthState>(initialAuthState);

  const restoreSession = useCallback(async () => {
    const token = await getToken();

    if (!token) {
      setAuthState({
        isLoading: false,
        isAuthenticated: false,
        token: null,
        user: null,
      });
      return;
    }

    const res = await fetchMeApi(token);

    if (res.success && res.user) {
      setAuthState({
        isLoading: false,
        isAuthenticated: true,
        token,
        user: res.user,
      });
    } else {
      await clearToken();
      setAuthState({
        isLoading: false,
        isAuthenticated: false,
        token: null,
        user: null,
      });
    }
  }, []);

  useEffect(() => {
    restoreSession();
  }, [restoreSession]);

  const login = async (email: string, password: string) => {
    const res = await loginApi(email, password);

    if (res.success && res.token) {
      await saveToken(res.token);
      await restoreSession();
      return { success: true, message: res.message };
    }

    return { success: false, message: res.message };
  };

  const register = async (fullName: string, email: string, password: string) => {
    const res = await registerApi(fullName, email, password);

    if (res.success && res.token) {
      await saveToken(res.token);
      await restoreSession();
      return { success: true, message: res.message };
    }

    return { success: false, message: res.message };
  };

  const logout = async () => {
    await clearToken();
    setAuthState({
      isLoading: false,
      isAuthenticated: false,
      token: null,
      user: null,
    });
  };

  return (
    <AuthContext.Provider
      value={{
        ...authState,
        login,
        register,
        logout,
        restoreSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
