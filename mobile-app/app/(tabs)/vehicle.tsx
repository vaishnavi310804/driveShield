import React from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { ScreenHeader } from "../../src/components/ScreenHeader";
import { Card } from "../../src/components/Card";
import { StatusBadge } from "../../src/components/StatusBadge";
import { MetricItem } from "../../src/components/MetricItem";
import { useVehicle } from "../../src/modules/vehicle/VehicleContext";
import { COLORS, SPACING, TYPOGRAPHY } from "../../src/theme/theme";

export default function VehicleScreen() {
  const { vehicle, errorMessage } = useVehicle();

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* 1. HEADER */}
        <ScreenHeader
          title="Vehicle"
          subtitle="Vehicle profile and health"
        />

        {/* 2. VEHICLE PROFILE CARD */}
        <Card>
          <View style={styles.profileHeader}>
            <View style={styles.carIconContainer}>
              <Ionicons name="car-sport" size={26} color={COLORS.primary} />
            </View>
            <View style={styles.profileTitleContainer}>
              <Text style={styles.vehicleName}>
                {vehicle ? `${vehicle.make} ${vehicle.model}` : "No Active Vehicle"}
              </Text>
              <Text style={styles.vehicleSubtext}>
                {vehicle
                  ? `${vehicle.year} • ${vehicle.vehicleType.toUpperCase()}`
                  : errorMessage || "No active vehicle registered."}
              </Text>
            </View>
            <StatusBadge
              label={vehicle ? "Connected" : "Unlinked"}
              type={vehicle ? "success" : "warning"}
            />
          </View>

          {vehicle && (
            <View style={styles.detailsGrid}>
              <View style={styles.detailRow}>
                <Text style={TYPOGRAPHY.body}>License Plate</Text>
                <Text style={styles.detailValue}>{vehicle.licensePlate}</Text>
              </View>
              {vehicle.color && (
                <View style={styles.detailRowLast}>
                  <Text style={TYPOGRAPHY.body}>Color</Text>
                  <Text style={styles.detailValue}>{vehicle.color}</Text>
                </View>
              )}
            </View>
          )}
        </Card>

        {/* 3. LIVE TELEMETRY CARD */}
        <Card title="Live Telemetry" subtitle="Real-time Sensor Data">
          <View style={styles.gridRow}>
            <MetricItem label="Speed" value="64 km/h" />
            <MetricItem label="RPM" value="2,140" />
          </View>
          <View style={[styles.gridRow, { marginTop: SPACING.sm }]}>
            <MetricItem label="Engine Load" value="42%" />
            <MetricItem label="Throttle" value="28%" />
          </View>
        </Card>

        {/* 4. VEHICLE HEALTH CARD */}
        <Card title="Vehicle Health" subtitle="Operating Characteristics">
          <View style={styles.detailRow}>
            <Text style={TYPOGRAPHY.body}>Engine</Text>
            <StatusBadge label="Normal" type="success" />
          </View>
          <View style={styles.detailRow}>
            <Text style={TYPOGRAPHY.body}>Coolant Temp</Text>
            <Text style={styles.detailValue}>92°C</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={TYPOGRAPHY.body}>Battery Voltage</Text>
            <Text style={styles.detailValue}>12.6 V</Text>
          </View>
          <View style={styles.detailRowLast}>
            <Text style={TYPOGRAPHY.body}>Diagnostics</Text>
            <StatusBadge label="No Faults" type="success" />
          </View>
        </Card>

        {/* 5. DIAGNOSTIC STATUS */}
        <View style={styles.diagnosticBanner}>
          <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />
          <Text style={styles.diagnosticText}>No active diagnostic faults</Text>
        </View>

        {/* 6. MONITORING STATUS */}
        <Card style={styles.monitoringCard}>
          <View style={styles.rowBetween}>
            <View style={styles.rowAlign}>
              <View style={styles.activeDot} />
              <Text style={styles.monitoringTitle}>Vehicle monitoring active</Text>
            </View>
            <StatusBadge label="Active" type="info" />
          </View>
          <Text style={styles.monitoringText}>
            Telemetry is being monitored during the drive.
          </Text>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.xl,
  },
  profileHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: SPACING.md,
  },
  carIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.surfaceLight,
    alignItems: "center",
    justifyContent: "center",
    marginRight: SPACING.md,
  },
  profileTitleContainer: {
    flex: 1,
  },
  vehicleName: {
    ...TYPOGRAPHY.subHeader,
    color: COLORS.textPrimary,
  },
  vehicleSubtext: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  detailsGrid: {
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 8,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: SPACING.xs,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  detailRowLast: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: SPACING.xs,
  },
  detailValue: {
    ...TYPOGRAPHY.body,
    fontWeight: "600",
    color: COLORS.textPrimary,
  },
  gridRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  diagnosticBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#063A2F",
    borderColor: "#065F46",
    borderWidth: 1,
    borderRadius: 10,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  diagnosticText: {
    ...TYPOGRAPHY.body,
    fontWeight: "600",
    color: "#6EE7B7",
    marginLeft: SPACING.sm,
  },
  monitoringCard: {
    backgroundColor: COLORS.surface,
    marginBottom: SPACING.lg,
  },
  rowAlign: {
    flexDirection: "row",
    alignItems: "center",
  },
  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  activeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.primary,
    marginRight: SPACING.sm,
  },
  monitoringTitle: {
    ...TYPOGRAPHY.cardTitle,
    color: COLORS.textPrimary,
  },
  monitoringText: {
    ...TYPOGRAPHY.body,
    color: COLORS.textMuted,
    fontSize: 13,
    lineHeight: 18,
    marginTop: SPACING.xs,
  },
});
