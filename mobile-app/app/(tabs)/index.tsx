import React from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { ScreenHeader } from "../../src/components/ScreenHeader";
import { Card } from "../../src/components/Card";
import { StatusBadge } from "../../src/components/StatusBadge";
import { MetricItem } from "../../src/components/MetricItem";
import { EmergencyAction } from "../../src/components/EmergencyAction";
import { COLORS, SPACING, TYPOGRAPHY } from "../../src/theme/theme";

export default function HomeScreen() {
  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* 1. HEADER */}
        <ScreenHeader
          title="Safety Overview"
          subtitle="Your vehicle and driver status"
        />

        {/* 2. PRIMARY SAFETY STATUS CARD */}
        <View style={styles.primaryStatusCard}>
          <View style={styles.primaryStatusHeader}>
            <View style={styles.statusIconContainer}>
              <Ionicons name="shield-checkmark" size={32} color={COLORS.success} />
            </View>
            <View style={styles.statusTextContainer}>
              <Text style={styles.primaryStatusTitle}>YOU ARE SAFE</Text>
              <Text style={styles.primaryStatusSubtitle}>No active safety concerns</Text>
            </View>
          </View>
          <View style={styles.badgeRow}>
            <StatusBadge label="All Systems Normal" type="success" />
          </View>
        </View>

        {/* 3. CURRENT DRIVE / MONITORING CARD */}
        <Card style={styles.monitoringCard}>
          <View style={styles.rowBetween}>
            <View style={styles.rowAlign}>
              <View style={styles.activeDot} />
              <Text style={styles.monitoringTitle}>Safety Monitoring Active</Text>
            </View>
            <StatusBadge label="Live" type="info" />
          </View>
          <Text style={styles.monitoringText}>
            Vehicle sensors and driver state are being monitored.
          </Text>
        </Card>

        {/* 4. VEHICLE STATUS CARD */}
        <Card title="Vehicle Status" subtitle="Connected Telemetry">
          <View style={styles.rowBetweenMargin}>
            <Text style={styles.vehicleName}>Toyota Camry</Text>
            <StatusBadge label="Connected" type="success" />
          </View>
          <View style={styles.metricsRow}>
            <MetricItem label="Speed" value="64 km/h" />
            <MetricItem label="RPM" value="2,140" />
            <MetricItem label="Engine" value="Normal" />
          </View>
        </Card>

        {/* 5. DRIVER SAFETY CARD */}
        <Card title="Driver Safety" subtitle="DMS Status">
          <View style={styles.rowBetweenMargin}>
            <Text style={TYPOGRAPHY.body}>Attention:</Text>
            <StatusBadge label="Focused" type="success" />
          </View>
          <View style={styles.driverMetricsRow}>
            <View style={styles.driverMetricItem}>
              <Text style={TYPOGRAPHY.caption}>Fatigue</Text>
              <Text style={styles.driverMetricValue}>Normal</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.driverMetricItem}>
              <Text style={TYPOGRAPHY.caption}>PERCLOS</Text>
              <Text style={styles.driverMetricValue}>4.2%</Text>
            </View>
          </View>
        </Card>

        {/* 6. EMERGENCY ACTION */}
        <EmergencyAction />
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
  primaryStatusCard: {
    backgroundColor: "#063A2F",
    borderColor: "#065F46",
    borderWidth: 1.5,
    borderRadius: 16,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  primaryStatusHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: SPACING.sm,
  },
  statusIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#064E3B",
    alignItems: "center",
    justifyContent: "center",
    marginRight: SPACING.md,
  },
  statusTextContainer: {
    flex: 1,
  },
  primaryStatusTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#6EE7B7",
    letterSpacing: 0.5,
  },
  primaryStatusSubtitle: {
    fontSize: 13,
    color: "#A7F3D0",
    marginTop: 2,
  },
  badgeRow: {
    marginTop: SPACING.xs,
  },
  monitoringCard: {
    backgroundColor: COLORS.surface,
  },
  rowAlign: {
    flexDirection: "row",
    alignItems: "center",
  },
  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SPACING.xs,
  },
  rowBetweenMargin: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SPACING.md,
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
  vehicleName: {
    ...TYPOGRAPHY.subHeader,
    fontSize: 16,
    color: COLORS.textPrimary,
  },
  metricsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: SPACING.xs,
  },
  driverMetricsRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.surfaceLight,
    padding: SPACING.sm,
    borderRadius: 8,
    marginTop: SPACING.xs,
  },
  driverMetricItem: {
    flex: 1,
    alignItems: "center",
  },
  driverMetricValue: {
    ...TYPOGRAPHY.cardTitle,
    color: COLORS.textPrimary,
    marginTop: 2,
    fontSize: 14,
  },
  divider: {
    width: 1,
    height: 24,
    backgroundColor: COLORS.borderLight,
  },
});
