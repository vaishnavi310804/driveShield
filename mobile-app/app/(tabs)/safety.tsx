import React from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { ScreenHeader } from "../../src/components/ScreenHeader";
import { Card } from "../../src/components/Card";
import { StatusBadge } from "../../src/components/StatusBadge";
import { COLORS, SPACING, TYPOGRAPHY } from "../../src/theme/theme";

export default function SafetyScreen() {
  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* 1. HEADER */}
        <ScreenHeader
          title="Driver Safety"
          subtitle="Attention and fatigue monitoring"
        />

        {/* 2. PRIMARY DRIVER STATE CARD */}
        <View style={styles.primaryStatusCard}>
          <View style={styles.primaryStatusHeader}>
            <View style={styles.statusIconContainer}>
              <Ionicons name="eye" size={28} color={COLORS.success} />
            </View>
            <View style={styles.statusTextContainer}>
              <Text style={styles.primaryStatusTitle}>FOCUSED</Text>
              <Text style={styles.primaryStatusSubtitle}>Your attention level appears normal</Text>
            </View>
          </View>
          <View style={styles.badgeRow}>
            <StatusBadge label="Attention Normal" type="success" />
          </View>
        </View>

        {/* 3. ATTENTION STATUS CARD */}
        <Card title="Attention" subtitle="DMS Gaze & Pose">
          <View style={styles.detailRow}>
            <Text style={TYPOGRAPHY.body}>Attention State</Text>
            <StatusBadge label="Focused" type="success" />
          </View>
          <View style={styles.detailRow}>
            <Text style={TYPOGRAPHY.body}>Gaze</Text>
            <Text style={styles.detailValue}>Forward</Text>
          </View>
          <View style={styles.detailRowLast}>
            <Text style={TYPOGRAPHY.body}>Head Pose</Text>
            <Text style={styles.detailValue}>Normal</Text>
          </View>
        </Card>

        {/* 4. FATIGUE MONITORING CARD */}
        <Card title="Fatigue Monitoring" subtitle="Drowsiness Indicators">
          <View style={styles.detailRow}>
            <Text style={TYPOGRAPHY.body}>PERCLOS</Text>
            <Text style={styles.detailValue}>4.2%</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={TYPOGRAPHY.body}>Blink Rate</Text>
            <StatusBadge label="Normal" type="success" />
          </View>
          <View style={styles.detailRowLast}>
            <Text style={TYPOGRAPHY.body}>Yawning</Text>
            <StatusBadge label="Normal" type="success" />
          </View>
        </Card>

        {/* 5. DRIVER BASELINE CARD */}
        <Card title="Personal Baseline" subtitle="Learned Characteristics">
          <View style={styles.detailRow}>
            <Text style={TYPOGRAPHY.body}>Normal Attention</Text>
            <Text style={styles.detailValue}>Focused</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={TYPOGRAPHY.body}>Typical PERCLOS</Text>
            <Text style={styles.detailValue}>4–6%</Text>
          </View>
          <View style={styles.detailRowLast}>
            <Text style={TYPOGRAPHY.body}>Baseline Status</Text>
            <StatusBadge label="Established" type="info" />
          </View>
        </Card>

        {/* 6. SAFETY RECOMMENDATION / STATUS CARD */}
        <Card style={styles.recommendationCard}>
          <View style={styles.rowAlign}>
            <Ionicons name="information-circle" size={20} color={COLORS.primary} style={styles.recommendationIcon} />
            <View style={styles.recommendationTextContainer}>
              <Text style={styles.recommendationTitle}>Stay attentive</Text>
              <Text style={styles.recommendationSubtitle}>
                Your current driver state is within your normal range.
              </Text>
            </View>
          </View>
        </Card>

        {/* 7. MONITORING STATUS CARD */}
        <Card style={styles.monitoringCard}>
          <View style={styles.rowBetween}>
            <View style={styles.rowAlign}>
              <View style={styles.activeDot} />
              <Text style={styles.monitoringTitle}>Driver monitoring active</Text>
            </View>
            <StatusBadge label="Active" type="info" />
          </View>
          <Text style={styles.monitoringText}>
            Driver attention and fatigue indicators are being monitored.
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
  recommendationCard: {
    backgroundColor: COLORS.surface,
  },
  recommendationIcon: {
    marginRight: SPACING.sm,
  },
  recommendationTextContainer: {
    flex: 1,
  },
  recommendationTitle: {
    ...TYPOGRAPHY.cardTitle,
    color: COLORS.textPrimary,
    fontSize: 15,
  },
  recommendationSubtitle: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
    fontSize: 13,
    marginTop: 2,
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
