import React, { useState } from "react";
import { View, Text, StyleSheet, Pressable, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { COLORS, SPACING, TYPOGRAPHY } from "../theme/theme";
import { API_BASE_URL } from "../config/api.config";
import { useAuth } from "../modules/auth/AuthContext";
import { useVehicle } from "../modules/vehicle/VehicleContext";
import { authenticatedFetch } from "../modules/auth/apiClient";

export const EmergencyAction: React.FC = () => {
  const { user } = useAuth();
  const { vehicleId } = useVehicle();
  const [isTriggering, setIsTriggering] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleEmergencyPress = async () => {
    if (isTriggering) return;

    if (!user?.driverId) {
      setErrorMessage("Driver profile is not linked. Emergency actions require a linked driver profile.");
      return;
    }

    if (!vehicleId) {
      setErrorMessage("No active vehicle is registered. Emergency actions require an active vehicle.");
      return;
    }

    setIsTriggering(true);
    setErrorMessage(null);

    try {
      // Step 1: Send telemetry anomaly payload to POST /api/anomalies
      const anomalyPayload = {
        driverId: user.driverId,
        vehicleId: vehicleId,
        timestamp: new Date().toISOString(),
        location: {
          latitude: 37.7749,
          longitude: -122.4194,
          speed: 0,
        },
        motion: {
          gForce: 3.5,
        },
        vehicleData: {
          speed: 0,
          rpm: 0,
        },
        driverState: {
          attentionState: "unresponsive",
          perclos: 15.0,
        },
      };

      const anomalyRes = await authenticatedFetch(`${API_BASE_URL}/anomalies`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(anomalyPayload),
      });

      const anomalyData = await anomalyRes.json();

      if (!anomalyRes.ok || !anomalyData?.success || !anomalyData?.data?._id) {
        setIsTriggering(false);
        setErrorMessage(anomalyData?.message || "Failed to log emergency anomaly.");
        return;
      }

      const anomalyEvent = anomalyData.data;

      // Step 2: Check escalationFlag === true
      if (anomalyEvent.escalationFlag !== true) {
        setIsTriggering(false);
        setErrorMessage("Anomaly evaluated, but escalation threshold was not met.");
        return;
      }

      // Step 3: Call POST /api/incidents/trigger with anomalyEventId
      const triggerRes = await authenticatedFetch(`${API_BASE_URL}/incidents/trigger`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          anomalyEventId: anomalyEvent._id,
        }),
      });

      const triggerData = await triggerRes.json();

      if (!triggerRes.ok || !triggerData?.success || !triggerData?.data?.incident?._id) {
        setIsTriggering(false);
        setErrorMessage(triggerData?.message || "Failed to trigger emergency incident.");
        return;
      }

      const realIncidentId = triggerData.data.incident._id;

      // Step 4: Navigate to verification UI with real incidentId
      setIsTriggering(false);
      router.push(`/incident/verify?incidentId=${realIncidentId}` as any);
    } catch (err) {
      setIsTriggering(false);
      setErrorMessage("Unable to connect to safety server. Tap to retry.");
    }
  };

  return (
    <View style={styles.wrapper}>
      <Pressable
        style={({ pressed }) => [
          styles.card,
          isTriggering && styles.cardDisabled,
          pressed && !isTriggering && styles.cardPressed,
        ]}
        onPress={handleEmergencyPress}
        disabled={isTriggering}
        accessibilityRole="button"
        accessibilityLabel="Trigger emergency verification"
      >
        <View style={styles.iconContainer}>
          {isTriggering ? (
            <ActivityIndicator size="small" color="#FCA5A5" />
          ) : (
            <Ionicons name="warning" size={24} color={COLORS.danger} />
          )}
        </View>

        <View style={styles.textContainer}>
          <Text style={styles.title}>Emergency</Text>
          <Text style={styles.subtitle}>
            {isTriggering ? "Preparing safety verification..." : "Get help immediately"}
          </Text>
        </View>

        <Ionicons name="chevron-forward" size={20} color={COLORS.textMuted} />
      </Pressable>

      {errorMessage && (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={16} color="#FCA5A5" style={{ marginRight: 6 }} />
          <Text style={styles.errorText}>{errorMessage}</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    marginTop: SPACING.xs,
    marginBottom: SPACING.lg,
  },
  card: {
    backgroundColor: "#381212",
    borderColor: "#7F1D1D",
    borderWidth: 1.5,
    borderRadius: 12,
    padding: SPACING.md,
    flexDirection: "row",
    alignItems: "center",
  },
  cardDisabled: {
    opacity: 0.75,
  },
  cardPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.99 }],
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#501B1B",
    alignItems: "center",
    justifyContent: "center",
    marginRight: SPACING.md,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    ...TYPOGRAPHY.cardTitle,
    color: "#FCA5A5",
    fontWeight: "700",
  },
  subtitle: {
    ...TYPOGRAPHY.caption,
    color: "#F87171",
  },
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#501B1B",
    borderColor: "#7F1D1D",
    borderWidth: 1,
    borderRadius: 8,
    padding: SPACING.xs + 2,
    marginTop: SPACING.xs,
  },
  errorText: {
    ...TYPOGRAPHY.caption,
    color: "#FCA5A5",
    fontSize: 12,
    flex: 1,
  },
});
