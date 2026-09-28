import React, { useEffect } from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { AuthProvider, useAuth } from "../src/modules/auth/AuthContext";
import { VehicleProvider, useVehicle } from "../src/modules/vehicle/VehicleContext";
import { TelemetryProvider } from "../src/modules/telemetry";
import { COLORS } from "../src/theme/theme";

function RootLayoutNav() {
  const { isLoading, isAuthenticated, user } = useAuth();
  const { status: vehicleStatus } = useVehicle();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = (segments[0] as string) === "auth";
    const inOnboardingGroup = (segments[0] as string) === "onboarding";
    const currentSubSegment = segments[1] as string;

    if (!isAuthenticated && !inAuthGroup) {
      // Redirect unauthenticated user to login
      router.replace("/auth/login" as any);
    } else if (isAuthenticated) {
      if (!user?.driverId && currentSubSegment !== "driver") {
        // Redirect authenticated user with no driver profile to driver setup
        router.replace("/onboarding/driver" as any);
      } else if (
        user?.driverId &&
        vehicleStatus === "NOT_FOUND" &&
        currentSubSegment !== "vehicle"
      ) {
        // Redirect authenticated user with driver profile but no vehicle to vehicle setup
        router.replace("/onboarding/vehicle" as any);
      } else if (
        user?.driverId &&
        vehicleStatus === "AVAILABLE" &&
        (inAuthGroup || inOnboardingGroup)
      ) {
        // Redirect fully setup user to tabs
        router.replace("/(tabs)" as any);
      }
    }
  }, [isLoading, isAuthenticated, user?.driverId, vehicleStatus, segments]);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: COLORS.background },
      }}
    >
      <Stack.Screen name="auth/login" options={{ headerShown: false }} />
      <Stack.Screen name="auth/register" options={{ headerShown: false }} />
      <Stack.Screen name="onboarding/driver" options={{ headerShown: false }} />
      <Stack.Screen name="onboarding/vehicle" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen
        name="incident/verify"
        options={{
          headerShown: false,
          presentation: "modal",
        }}
      />
      <Stack.Screen
        name="incident/mobilizing"
        options={{
          headerShown: false,
          presentation: "modal",
        }}
      />
      <Stack.Screen
        name="incident/timeline"
        options={{
          headerShown: false,
          presentation: "modal",
        }}
      />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <VehicleProvider>
        <TelemetryProvider>
          <StatusBar style="light" />
          <RootLayoutNav />
        </TelemetryProvider>
      </VehicleProvider>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
    alignItems: "center",
    justifyContent: "center",
  },
});
