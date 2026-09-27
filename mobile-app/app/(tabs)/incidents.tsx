import React, { useState, useCallback } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { ScreenHeader } from "../../src/components/ScreenHeader";
import { Card } from "../../src/components/Card";
import { StatusBadge } from "../../src/components/StatusBadge";
import { COLORS, SPACING, TYPOGRAPHY } from "../../src/theme/theme";
import { API_BASE_URL, DEMO_DRIVER_ID } from "../../src/config/api.config";

interface IncidentRecord {
  id: string;
  incidentId?: string;
  title: string;
  timestamp: string;
  status: "Resolved" | "Active" | "Escalated";
  statusType: "success" | "warning" | "danger" | "info";
  severity: "Low" | "Moderate" | "Critical";
  severityType: "info" | "warning" | "danger";
  description: string;
  iconName: keyof typeof Ionicons.glyphMap;
}

const isValidObjectId = (id?: string): boolean => {
  return Boolean(id && /^[0-9a-fA-F]{24}$/.test(id.trim()));
};

const formatIncidentTimestamp = (isoString?: string): string => {
  if (!isoString) return "Unknown time";
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return isoString;

    const now = new Date();
    const isToday =
      date.getDate() === now.getDate() &&
      date.getMonth() === now.getMonth() &&
      date.getFullYear() === now.getFullYear();

    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const isYesterday =
      date.getDate() === yesterday.getDate() &&
      date.getMonth() === yesterday.getMonth() &&
      date.getFullYear() === yesterday.getFullYear();

    const timeStr = date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });

    if (isToday) {
      return `Today · ${timeStr}`;
    }
    if (isYesterday) {
      return `Yesterday · ${timeStr}`;
    }

    const monthNames = [
      "Jan", "Feb", "Mar", "Apr", "May", "Jun",
      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
    ];
    const monthStr = monthNames[date.getMonth()];
    const dayStr = String(date.getDate()).padStart(2, "0");
    return `${monthStr} ${dayStr} · ${timeStr}`;
  } catch {
    return isoString;
  }
};

const mapBackendIncidentToRecord = (item: any): IncidentRecord => {
  const id = String(item._id || item.id || "");
  const timestamp = formatIncidentTimestamp(item.timestamp || item.createdAt);

  let title = "Safety Event";
  let severityLabel: "Low" | "Moderate" | "Critical" = "Moderate";
  let severityType: "info" | "warning" | "danger" = "warning";
  let iconName: keyof typeof Ionicons.glyphMap = "warning-outline";

  const rawSeverity = String(item.severity || "").toLowerCase();

  if (rawSeverity === "fatigue_drowsiness") {
    title = "Driver Fatigue Warning";
    severityLabel = "Critical";
    severityType = "danger";
    iconName = "eye-outline";
  } else if (rawSeverity === "suspected_accident") {
    title = "Suspected Collision";
    severityLabel = "Critical";
    severityType = "danger";
    iconName = "alert-circle-outline";
  } else if (rawSeverity === "high_gforce") {
    title = "High G-Force Event";
    severityLabel = "Moderate";
    severityType = "warning";
    iconName = "pulse-outline";
  } else if (rawSeverity === "rpm_drop_stall") {
    title = "Engine Stall Event";
    severityLabel = "Moderate";
    severityType = "warning";
    iconName = "speedometer-outline";
  } else if (rawSeverity === "critical_vehicle_parameter") {
    title = "Critical Vehicle Parameter";
    severityLabel = "Moderate";
    severityType = "warning";
    iconName = "options-outline";
  } else if (rawSeverity === "critical") {
    title = "Critical Safety Event";
    severityLabel = "Critical";
    severityType = "danger";
    iconName = "alert-circle-outline";
  } else if (rawSeverity === "low") {
    title = "Safety Advisory";
    severityLabel = "Low";
    severityType = "info";
    iconName = "information-circle-outline";
  }

  let statusLabel: "Resolved" | "Active" | "Escalated" = "Active";
  let statusType: "success" | "warning" | "danger" | "info" = "info";

  const currentState = String(item.currentState || "");

  if (currentState.startsWith("STATE 0")) {
    statusLabel = "Resolved";
    statusType = "success";
  } else if (currentState.startsWith("STATE 4B")) {
    statusLabel = "Escalated";
    statusType = "danger";
  } else if (
    currentState.startsWith("STATE 1") ||
    currentState.startsWith("STATE 2") ||
    currentState.startsWith("STATE 3") ||
    currentState.startsWith("STATE 4A")
  ) {
    statusLabel = "Active";
    statusType = "warning";
  }

  let description = "";
  if (
    item.location?.latitude !== undefined &&
    item.location?.latitude !== null &&
    item.location?.longitude !== undefined &&
    item.location?.longitude !== null
  ) {
    const lat = Number(item.location.latitude).toFixed(4);
    const lon = Number(item.location.longitude).toFixed(4);
    const speed =
      item.location.speed !== undefined && item.location.speed !== null
        ? Math.round(Number(item.location.speed))
        : null;
    description = `Logged at lat ${lat}, lon ${lon}${
      speed !== null ? ` (${speed} km/h)` : ""
    }`;
  } else if (item.driverStateAssessment) {
    description = `Driver assessment: ${item.driverStateAssessment}`;
  } else {
    description = `Incident recorded with status ${currentState || "Active"}`;
  }

  return {
    id,
    incidentId: id,
    title,
    timestamp,
    status: statusLabel,
    statusType,
    severity: severityLabel,
    severityType,
    description,
    iconName,
  };
};

export default function IncidentsScreen() {
  const [incidents, setIncidents] = useState<IncidentRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchIncidents = async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await fetch(
        `${API_BASE_URL}/incidents?driverId=${DEMO_DRIVER_ID}&limit=20`
      );
      const data = await response.json();

      if (response.ok && data?.success) {
        const mapped = Array.isArray(data.data)
          ? data.data.map(mapBackendIncidentToRecord)
          : [];
        setIncidents(mapped);
      } else {
        setErrorMessage(data?.message || "Unable to fetch incident history.");
      }
    } catch (err) {
      setErrorMessage("Network error. Unable to fetch incident history.");
    } finally {
      setIsLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchIncidents();
    }, [])
  );

  const handleCardPress = (item: IncidentRecord) => {
    const targetId = item.incidentId || item.id;
    if (isValidObjectId(targetId)) {
      router.push(`/incident/timeline?incidentId=${targetId}` as any);
    }
  };

  const hasActiveIncident = incidents.some(
    (item) => item.status === "Active"
  );

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* 1. HEADER */}
        <ScreenHeader
          title="Incidents"
          subtitle="Safety events and incident history"
        />

        {/* 2. ACTIVE STATUS SUMMARY */}
        <Card style={styles.summaryCard}>
          <View style={styles.summaryHeader}>
            <View
              style={[
                styles.statusIconContainer,
                hasActiveIncident && styles.statusIconContainerWarning,
              ]}
            >
              <Ionicons
                name={hasActiveIncident ? "warning-outline" : "shield-checkmark"}
                size={28}
                color={hasActiveIncident ? COLORS.warning : COLORS.success}
              />
            </View>
            <View style={styles.summaryTextContainer}>
              <Text style={styles.summaryLabel}>Current Status</Text>
              <Text style={styles.summaryValue}>
                {hasActiveIncident ? "Incident active" : "Normal operation"}
              </Text>
            </View>
            <StatusBadge
              label={hasActiveIncident ? "Active" : "Normal"}
              type={hasActiveIncident ? "warning" : "success"}
            />
          </View>

          <View style={styles.summaryDivider} />

          <View style={styles.summaryFooter}>
            <View
              style={[
                styles.activeDot,
                hasActiveIncident && styles.activeDotWarning,
              ]}
            />
            <Text style={styles.summaryFooterText}>
              {hasActiveIncident
                ? "Active incident in progress"
                : "No active incidents"}
            </Text>
          </View>
        </Card>

        {/* 3. RECENT INCIDENTS SECTION HEADER */}
        <View style={styles.sectionHeaderContainer}>
          <Text style={styles.sectionTitle}>Recent Incidents</Text>
          <Text style={styles.sectionCount}>
            {incidents.length} logged {incidents.length === 1 ? "record" : "records"}
          </Text>
        </View>

        {/* 4. LOADING STATE */}
        {isLoading && (
          <View style={styles.centerContainer}>
            <ActivityIndicator
              size="large"
              color={COLORS.primary}
              style={{ marginBottom: SPACING.md }}
            />
            <Text style={styles.loadingText}>Loading incident history...</Text>
          </View>
        )}

        {/* 5. ERROR STATE */}
        {!isLoading && errorMessage && (
          <View style={styles.errorContainer}>
            <Ionicons
              name="warning-outline"
              size={44}
              color="#EF4444"
              style={{ marginBottom: SPACING.sm }}
            />
            <Text style={styles.errorTitle}>Unable to Load Incidents</Text>
            <Text style={styles.errorSubtext}>{errorMessage}</Text>
            <Pressable
              style={({ pressed }) => [
                styles.retryButton,
                pressed && styles.buttonPressed,
              ]}
              onPress={fetchIncidents}
            >
              <Text style={styles.retryButtonText}>Retry</Text>
            </Pressable>
          </View>
        )}

        {/* 6. EMPTY STATE */}
        {!isLoading && !errorMessage && incidents.length === 0 && (
          <Card style={styles.emptyCard}>
            <Ionicons
              name="time-outline"
              size={48}
              color={COLORS.textMuted}
              style={{ marginBottom: SPACING.sm }}
            />
            <Text style={styles.emptyTitle}>No Logged Incidents</Text>
            <Text style={styles.emptySubtext}>
              No incident records found for this driver profile.
            </Text>
          </Card>
        )}

        {/* 7. INCIDENT CARDS */}
        {!isLoading &&
          !errorMessage &&
          incidents.map((item) => {
            const targetId = item.incidentId || item.id;
            const isNavigable = isValidObjectId(targetId);

            return (
              <Pressable
                key={item.id}
                onPress={() => handleCardPress(item)}
                disabled={!isNavigable}
                accessibilityRole={isNavigable ? "button" : undefined}
                accessibilityLabel={
                  isNavigable
                    ? `View incident timeline for ${item.title}`
                    : item.title
                }
                style={({ pressed }) => [
                  pressed && isNavigable && styles.cardPressed,
                ]}
              >
                <Card style={styles.incidentCard}>
                  <View style={styles.incidentHeader}>
                    <View style={styles.iconWrapper}>
                      <Ionicons
                        name={item.iconName}
                        size={20}
                        color={COLORS.primary}
                      />
                    </View>

                    <View style={styles.titleWrapper}>
                      <Text style={styles.incidentTitle}>{item.title}</Text>
                      <Text style={styles.incidentTimestamp}>
                        {item.timestamp}
                      </Text>
                    </View>

                    <Ionicons
                      name="chevron-forward"
                      size={18}
                      color={isNavigable ? COLORS.primary : COLORS.textMuted}
                      style={styles.chevron}
                    />
                  </View>

                  <Text style={styles.incidentDescription}>
                    {item.description}
                  </Text>

                  <View style={styles.badgeRow}>
                    <View style={styles.badgeItem}>
                      <Text style={styles.badgeLabel}>Severity:</Text>
                      <StatusBadge
                        label={item.severity}
                        type={item.severityType}
                      />
                    </View>
                    <View style={styles.badgeItem}>
                      <Text style={styles.badgeLabel}>Status:</Text>
                      <StatusBadge
                        label={item.status}
                        type={item.statusType}
                      />
                    </View>
                  </View>
                </Card>
              </Pressable>
            );
          })}
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
  centerContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: SPACING.xl * 2,
  },
  loadingText: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
  },
  summaryCard: {
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
    marginBottom: SPACING.lg,
  },
  summaryHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  statusIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#064E3B",
    alignItems: "center",
    justifyContent: "center",
    marginRight: SPACING.md,
  },
  statusIconContainerWarning: {
    backgroundColor: "#78350F",
  },
  summaryTextContainer: {
    flex: 1,
  },
  summaryLabel: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  summaryValue: {
    ...TYPOGRAPHY.subHeader,
    fontSize: 16,
    color: COLORS.textPrimary,
    marginTop: 2,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: SPACING.md,
  },
  summaryFooter: {
    flexDirection: "row",
    alignItems: "center",
  },
  activeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.success,
    marginRight: SPACING.sm,
  },
  activeDotWarning: {
    backgroundColor: COLORS.warning,
  },
  summaryFooterText: {
    ...TYPOGRAPHY.body,
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: "500",
  },
  sectionHeaderContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SPACING.sm,
    paddingHorizontal: SPACING.xs,
  },
  sectionTitle: {
    ...TYPOGRAPHY.subHeader,
    fontSize: 18,
    color: COLORS.textPrimary,
  },
  sectionCount: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textMuted,
  },
  emptyCard: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: SPACING.xl,
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
    marginBottom: SPACING.md,
  },
  emptyTitle: {
    ...TYPOGRAPHY.cardTitle,
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  emptySubtext: {
    ...TYPOGRAPHY.body,
    color: COLORS.textMuted,
    fontSize: 13,
  },
  errorContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: SPACING.xl,
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: 12,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  errorTitle: {
    ...TYPOGRAPHY.subHeader,
    fontSize: 16,
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  errorSubtext: {
    ...TYPOGRAPHY.body,
    fontSize: 13,
    color: COLORS.textMuted,
    textAlign: "center",
    marginBottom: SPACING.md,
  },
  retryButton: {
    backgroundColor: COLORS.surfaceLight,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
  },
  retryButtonText: {
    ...TYPOGRAPHY.cardTitle,
    fontSize: 14,
    color: COLORS.textPrimary,
  },
  buttonPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  incidentCard: {
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
    marginBottom: SPACING.md,
  },
  cardPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.99 }],
  },
  incidentHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: SPACING.sm,
  },
  iconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.surfaceLight,
    alignItems: "center",
    justifyContent: "center",
    marginRight: SPACING.sm,
  },
  titleWrapper: {
    flex: 1,
  },
  incidentTitle: {
    ...TYPOGRAPHY.cardTitle,
    fontSize: 15,
    color: COLORS.textPrimary,
  },
  incidentTimestamp: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  chevron: {
    marginLeft: SPACING.xs,
  },
  incidentDescription: {
    ...TYPOGRAPHY.body,
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 18,
    marginBottom: SPACING.md,
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
    backgroundColor: COLORS.surfaceLight,
    padding: SPACING.sm,
    borderRadius: 8,
    gap: SPACING.md,
  },
  badgeItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  badgeLabel: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textMuted,
    marginRight: SPACING.xs,
  },
});
