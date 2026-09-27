import React, { useEffect, useRef } from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { ScreenHeader } from "../../src/components/ScreenHeader";
import { Card } from "../../src/components/Card";
import { StatusBadge } from "../../src/components/StatusBadge";
import { SimulationControls } from "../../src/components/dev/SimulationControls";
import { useUnifiedTelemetry } from "../../src/modules/telemetry/hooks/useUnifiedTelemetry";
import { useTelemetryTransmission } from "../../src/modules/telemetry/hooks/useTelemetryTransmission";
import { COLORS, SPACING, TYPOGRAPHY } from "../../src/theme/theme";

const DRIVER_DATA = {
  name: "Alex Morgan",
  driverId: "DRV-001",
  licenseNumber: "DL-987654321",
  phone: "+1 555 010 1234",
  driverStatus: "Active",
  profileStatus: "Verified",
};

const EMERGENCY_CONTACT = {
  name: "Jordan Morgan",
  relationship: "Spouse",
  phone: "+1 555 010 5678",
};

const VEHICLE_DATA = {
  name: "Toyota Camry",
  yearType: "2022 • Sedan",
  licensePlate: "ABC-1234",
  status: "Connected",
};

export default function ProfileScreen() {
  // 1. Unified Telemetry Aggregator (5 sources)
  const {
    data: unifiedData,
    isCollecting,
    vehicleSimulationMode,
    driverStateSimulationMode,
    setVehicleSimulationMode,
    setDriverStateSimulationMode,
  } = useUnifiedTelemetry({
    enabled: true,
    motionUpdateIntervalMs: 200,
    locationTimeIntervalMs: 1000,
    vehicleUpdateIntervalMs: 500,
    driverStateUpdateIntervalMs: 1000,
    emissionIntervalMs: 200,
  });

  const unifiedDataRef = useRef(unifiedData);
  unifiedDataRef.current = unifiedData;

  // 2. Mobile Telemetry Transmission (POST /api/telemetry @ 1 Hz)
  const {
    status: transmissionStatus,
    isTransmitting,
    lastSuccessTimestamp,
    start: startTransmission,
  } = useTelemetryTransmission({
    transmissionIntervalMs: 1000,
  });

  useEffect(() => {
    startTransmission(() => unifiedDataRef.current);
  }, []);

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* 1. HEADER */}
        <ScreenHeader
          title="Profile"
          subtitle="Driver and emergency information"
        />

        {/* 2. DEVELOPMENT SIMULATION CONTROLS */}
        <SimulationControls
          vehicleMode={vehicleSimulationMode}
          driverMode={driverStateSimulationMode}
          onSelectVehicleMode={setVehicleSimulationMode}
          onSelectDriverMode={setDriverStateSimulationMode}
          transmissionStatus={transmissionStatus}
          isCollecting={isCollecting}
          isTransmitting={isTransmitting}
          lastSuccessTimestamp={lastSuccessTimestamp}
        />

        {/* 3. DRIVER PROFILE CARD */}
        <Card style={styles.profileCard}>
          <View style={styles.profileHeader}>
            <View style={styles.avatarContainer}>
              <Ionicons name="person" size={28} color={COLORS.primary} />
            </View>
            <View style={styles.profileTitleContainer}>
              <Text style={styles.driverName}>{DRIVER_DATA.name}</Text>
              <Text style={styles.driverId}>Driver ID: {DRIVER_DATA.driverId}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>License Number:</Text>
            <Text style={styles.infoValue}>{DRIVER_DATA.licenseNumber}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Phone:</Text>
            <Text style={styles.infoValue}>{DRIVER_DATA.phone}</Text>
          </View>

          {/* DRIVER STATUS */}
          <View style={styles.statusContainer}>
            <View style={styles.statusItem}>
              <Text style={styles.statusLabel}>Driver Status</Text>
              <StatusBadge label={DRIVER_DATA.driverStatus} type="success" />
            </View>
            <View style={styles.statusItem}>
              <Text style={styles.statusLabel}>Profile Status</Text>
              <StatusBadge label={DRIVER_DATA.profileStatus} type="info" />
            </View>
          </View>
        </Card>

        {/* 4. EMERGENCY CONTACT */}
        <Card title="Emergency Contact" subtitle="Primary emergency contact">
          <View style={styles.contactCardContent}>
            <View style={styles.iconWrapper}>
              <Ionicons name="call-outline" size={22} color={COLORS.primary} />
            </View>
            <View style={styles.contactDetails}>
              <Text style={styles.contactName}>{EMERGENCY_CONTACT.name}</Text>
              <Text style={styles.contactRelation}>{EMERGENCY_CONTACT.relationship}</Text>
              <Text style={styles.contactPhone}>{EMERGENCY_CONTACT.phone}</Text>
            </View>
            <StatusBadge label="Primary" type="info" />
          </View>
        </Card>

        {/* 5. REGISTERED VEHICLE */}
        <Card title="Registered Vehicle" subtitle="Connected safety vehicle">
          <View style={styles.vehicleCardContent}>
            <View style={styles.iconWrapper}>
              <Ionicons name="car-sport-outline" size={22} color={COLORS.primary} />
            </View>
            <View style={styles.vehicleDetails}>
              <Text style={styles.vehicleName}>{VEHICLE_DATA.name}</Text>
              <Text style={styles.vehicleSubtext}>{VEHICLE_DATA.yearType}</Text>
              <Text style={styles.licensePlate}>License Plate: {VEHICLE_DATA.licensePlate}</Text>
            </View>
            <StatusBadge label={VEHICLE_DATA.status} type="success" />
          </View>
        </Card>

        {/* 6. SAFETY INFORMATION */}
        <Card style={styles.safetyCard}>
          <View style={styles.safetyContent}>
            <Ionicons
              name="shield-outline"
              size={22}
              color={COLORS.textMuted}
              style={styles.safetyIcon}
            />
            <View style={styles.safetyTextWrapper}>
              <Text style={styles.safetyTitle}>Safety monitoring</Text>
              <Text style={styles.safetyDescription}>
                Driver and vehicle safety indicators are monitored while driving.
              </Text>
            </View>
          </View>
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
  profileCard: {
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
    marginBottom: SPACING.md,
  },
  profileHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: SPACING.sm,
  },
  avatarContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.surfaceLight,
    alignItems: "center",
    justifyContent: "center",
    marginRight: SPACING.md,
  },
  profileTitleContainer: {
    flex: 1,
  },
  driverName: {
    ...TYPOGRAPHY.subHeader,
    fontSize: 18,
    color: COLORS.textPrimary,
  },
  driverId: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: SPACING.md,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: SPACING.xs,
  },
  infoLabel: {
    ...TYPOGRAPHY.body,
    color: COLORS.textMuted,
  },
  infoValue: {
    ...TYPOGRAPHY.body,
    fontWeight: "600",
    color: COLORS.textPrimary,
  },
  statusContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: COLORS.surfaceLight,
    padding: SPACING.sm,
    borderRadius: 8,
    marginTop: SPACING.md,
  },
  statusItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.xs,
  },
  statusLabel: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textMuted,
    marginRight: 2,
  },
  contactCardContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.surfaceLight,
    alignItems: "center",
    justifyContent: "center",
    marginRight: SPACING.md,
  },
  contactDetails: {
    flex: 1,
  },
  contactName: {
    ...TYPOGRAPHY.cardTitle,
    fontSize: 15,
    color: COLORS.textPrimary,
  },
  contactRelation: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textMuted,
    marginTop: 1,
  },
  contactPhone: {
    ...TYPOGRAPHY.body,
    fontSize: 13,
    color: COLORS.primary,
    marginTop: 2,
    fontWeight: "500",
  },
  vehicleCardContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  vehicleDetails: {
    flex: 1,
  },
  vehicleName: {
    ...TYPOGRAPHY.cardTitle,
    fontSize: 15,
    color: COLORS.textPrimary,
  },
  vehicleSubtext: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textMuted,
    marginTop: 1,
  },
  licensePlate: {
    ...TYPOGRAPHY.body,
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  safetyCard: {
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
    marginTop: SPACING.xs,
    marginBottom: SPACING.md,
  },
  safetyContent: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  safetyIcon: {
    marginRight: SPACING.sm,
    marginTop: 2,
  },
  safetyTextWrapper: {
    flex: 1,
  },
  safetyTitle: {
    ...TYPOGRAPHY.cardTitle,
    fontSize: 14,
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  safetyDescription: {
    ...TYPOGRAPHY.body,
    fontSize: 13,
    color: COLORS.textMuted,
    lineHeight: 18,
  },
});
