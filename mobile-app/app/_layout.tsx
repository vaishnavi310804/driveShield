import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { COLORS } from "../src/theme/theme";

export default function RootLayout() {
  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: COLORS.background },
        }}
      >
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
    </>
  );
}
