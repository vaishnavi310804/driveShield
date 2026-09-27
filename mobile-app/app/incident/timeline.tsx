import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { ScreenHeader } from "../../src/components/ScreenHeader";
import { Card } from "../../src/components/Card";
import { StatusBadge } from "../../src/components/StatusBadge";
import { COLORS, SPACING, TYPOGRAPHY } from "../../src/theme/theme";
import { API_BASE_URL } from "../../src/config/api.config";

interface TimelineEventDetails {
  type?: string;
  deviationScore?: number;
  anomalyConfidence?: number;
  escalationFlag?: boolean;
  fromState?: string;
  toState?: string;
  action?: string;
  responderId?: string;
  recipientType?: string;
  recipientDetail?: string;
  status?: string;
  payload?: any;
}

interface TimelineEvent {
  timestamp: string;
  eventType: "ANOMALY" | "STATE_TRANSITION" | "RESPONDER_ACTION" | "NOTIFICATION";
  description: string;
  details: TimelineEventDetails;
}

export default function IncidentTimelineScreen() {
  const params = useLocalSearchParams<{ incidentId?: string }>();
  const rawIncidentId = Array.isArray(params.incidentId)
    ? params.incidentId[0]
    : params.incidentId;
  const incidentId = rawIncidentId?.trim();

  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (incidentId) {
      fetchTimeline();
    }
  }, [incidentId]);

  const fetchTimeline = async () => {
    if (!incidentId) return;

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await fetch(`${API_BASE_URL}/incidents/${incidentId}/timeline`);
      const data = await response.json();

      if (response.ok && data?.success) {
        setIsLoading(false);
        setEvents(Array.isArray(data.data) ? data.data : []);
      } else {
        setIsLoading(false);
        setErrorMessage(data?.message || "Unable to load incident timeline.");
      }
    } catch (err) {
      setIsLoading(false);
      setErrorMessage("Network error. Unable to load incident timeline.");
    }
  };

  const handleResetOrReturn = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/" as any);
    }
  };

  // Derive latest state from timeline
  const latestTransition = [...events]
    .reverse()
    .find((e) => e.eventType === "STATE_TRANSITION" && e.details?.toState);
  const currentState = latestTransition?.details?.toState || "State Unknown";
  const isTerminalState = currentState === "STATE 4B: AUTHORITY / EMERGENCY ESCALATION";

  // Missing incidentId guard
  if (!incidentId) {
    return (
      <SafeAreaView style={styles.container} edges={["top", "bottom", "left", "right"]}>
        <View style={styles.errorGuardContainer}>
          <View style={[styles.statusIconCircle, styles.warningBg]}>
            <Ionicons name="alert-circle-outline" size={64} color="#F59E0B" />
          </View>
          <Text style={styles.headerTitle}>Incident Not Identified</Text>
          <Text style={styles.headerSubtitle}>
            No valid incident identifier was provided to view the timeline.
          </Text>
          <Pressable
            style={({ pressed }) => [
              styles.primaryButton,
              pressed && styles.buttonPressed,
            ]}
            onPress={handleResetOrReturn}
          >
            <Text style={styles.primaryButtonText}>Return to Safety</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const getEventMeta = (eventType: string) => {
    switch (eventType) {
      case "ANOMALY":
        return { icon: "warning-outline", color: "#F59E0B", bg: "#451A03", label: "Anomaly" };
      case "STATE_TRANSITION":
        return { icon: "swap-horizontal-outline", color: "#38BDF8", bg: "#0C4A6E", label: "State Transition" };
      case "RESPONDER_ACTION":
        return { icon: "person-outline", color: "#34D399", bg: "#064E3B", label: "Responder Action" };
      case "NOTIFICATION":
        return { icon: "notifications-outline", color: "#FCA5A5", bg: "#7F1D1D", label: "Notification" };
      default:
        return { icon: "ellipse-outline", color: "#94A3B8", bg: "#1E293B", label: "Event" };
    }
  };

  const formatEventTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return (
        date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }) +
        " · " +
        date.toLocaleDateString([], { month: "short", day: "numeric" })
      );
    } catch {
      return isoString;
    }
  };

  const formatBadgeStateLabel = (rawState: string): string => {
    if (!rawState) return "State Unknown";
    if (rawState.includes("STATE 4B")) return "STATE 4B: ESCALATED";
    if (rawState.includes("STATE 4A")) return "STATE 4A: RESPONSE";
    if (rawState.includes("STATE 3")) return "STATE 3: MOBILIZATION";
    if (rawState.includes("STATE 2")) return "STATE 2: AI VERIFY";
    if (rawState.includes("STATE 1")) return "STATE 1: ANOMALY";
    if (rawState.includes("STATE 0")) return "STATE 0: NORMAL";
    return rawState;
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom", "left", "right"]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Top Navigation Bar */}
        <View style={styles.topBar}>
          <Pressable
            style={styles.closeButton}
            onPress={handleResetOrReturn}
            accessibilityLabel="Close timeline view"
          >
            <Ionicons name="close" size={24} color={COLORS.textSecondary} />
          </Pressable>
          <Text style={styles.topBarTitle}>AUDIT TIMELINE</Text>
        </View>

        {/* SCREEN HEADER */}
        <ScreenHeader
          title="Incident Timeline"
          subtitle="Event history and response"
        />

        {/* LOADING STATE */}
        {isLoading && (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} style={{ marginBottom: SPACING.md }} />
            <Text style={styles.loadingText}>Loading incident timeline...</Text>
          </View>
        )}

        {/* ERROR STATE */}
        {!isLoading && errorMessage && (
          <View style={styles.errorContainer}>
            <Ionicons name="warning-outline" size={48} color="#EF4444" style={{ marginBottom: SPACING.md }} />
            <Text style={styles.errorTitle}>Unable to load incident timeline</Text>
            <Text style={styles.errorSubtext}>{errorMessage}</Text>
            <Pressable
              style={({ pressed }) => [
                styles.retryButton,
                pressed && styles.buttonPressed,
              ]}
              onPress={fetchTimeline}
            >
              <Text style={styles.retryButtonText}>Try again</Text>
            </Pressable>
          </View>
        )}

        {/* TIMELINE CONTENT */}
        {!isLoading && !errorMessage && (
          <>
            {/* INCIDENT SUMMARY CARD */}
            <Card style={styles.summaryCard}>
              <View style={styles.summaryHeader}>
                <Text style={styles.summaryLabel}>Incident Status</Text>
                <StatusBadge
                  label={formatBadgeStateLabel(currentState)}
                  type={isTerminalState ? "danger" : "info"}
                />
              </View>
              {isTerminalState && (
                <View style={styles.terminalBadge}>
                  <Ionicons name="shield-checkmark" size={16} color="#FCA5A5" style={{ marginRight: 6 }} />
                  <Text style={styles.terminalText}>Emergency escalation completed</Text>
                </View>
              )}
              <Text style={styles.debugIdText}>Ref ID: {incidentId}</Text>
            </Card>


            {/* EMPTY TIMELINE */}
            {events.length === 0 && (
              <Card style={styles.emptyCard}>
                <Ionicons name="time-outline" size={48} color={COLORS.textMuted} style={{ marginBottom: SPACING.sm }} />
                <Text style={styles.emptyTitle}>No timeline events</Text>
                <Text style={styles.emptySubtext}>
                  There are no recorded events for this incident.
                </Text>
              </Card>
            )}

            {/* CHRONOLOGICAL TIMELINE LIST */}
            {events.length > 0 && (
              <View style={styles.timelineContainer}>
                {events.map((event, index) => {
                  const meta = getEventMeta(event.eventType);
                  const isLast = index === events.length - 1;

                  return (
                    <View key={index} style={styles.timelineItem}>
                      {/* Left Node Column */}
                      <View style={styles.nodeColumn}>
                        <View style={[styles.nodeIconCircle, { backgroundColor: meta.bg }]}>
                          <Ionicons name={meta.icon as any} size={18} color={meta.color} />
                        </View>
                        {!isLast && <View style={styles.connectingLine} />}
                      </View>

                      {/* Right Event Details Column */}
                      <View style={styles.eventContent}>
                        <View style={styles.eventHeaderRow}>
                          <Text style={[styles.eventBadgeText, { color: meta.color }]}>
                            {meta.label}
                          </Text>
                          <Text style={styles.eventTimestamp}>
                            {formatEventTime(event.timestamp)}
                          </Text>
                        </View>

                        <Text style={styles.eventDescription}>{event.description}</Text>

                        {/* Event Details Card Section */}
                        {event.details && (
                          <View style={styles.detailsBox}>
                            {event.eventType === "ANOMALY" && (
                              <>
                                <Text style={styles.detailRow}>
                                  Type: <Text style={styles.detailValue}>{event.details.type}</Text>
                                </Text>
                                {event.details.deviationScore !== undefined && (
                                  <Text style={styles.detailRow}>
                                    Deviation Score: <Text style={styles.detailValue}>{event.details.deviationScore}</Text>
                                  </Text>
                                )}
                                <Text style={styles.detailRow}>
                                  Escalated: <Text style={styles.detailValue}>{event.details.escalationFlag ? "Yes" : "No"}</Text>
                                </Text>
                              </>
                            )}

                            {event.eventType === "STATE_TRANSITION" && (
                              <>
                                <Text style={styles.detailRow}>
                                  From: <Text style={styles.detailValue}>{event.details.fromState}</Text>
                                </Text>
                                <Text style={styles.detailRow}>
                                  To: <Text style={styles.detailValue}>{event.details.toState}</Text>
                                </Text>
                              </>
                            )}

                            {event.eventType === "RESPONDER_ACTION" && (
                              <Text style={styles.detailRow}>
                                Action: <Text style={styles.detailValue}>{event.details.action}</Text>
                              </Text>
                            )}

                            {event.eventType === "NOTIFICATION" && (
                              <>
                                <Text style={styles.detailRow}>
                                  Target: <Text style={styles.detailValue}>{event.details.recipientType}</Text>
                                </Text>
                                {event.details.recipientDetail && (
                                  <Text style={styles.detailRow}>
                                    Detail: <Text style={styles.detailValue}>{event.details.recipientDetail}</Text>
                                  </Text>
                                )}
                                <Text style={styles.detailRow}>
                                  Status: <Text style={styles.detailValue}>{event.details.status}</Text>
                                </Text>
                              </>
                            )}
                          </View>
                        )}
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0B0F19",
  },
  scrollContent: {
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.xl,
    flexGrow: 1,
  },
  errorGuardContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: SPACING.lg,
  },
  centerContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: SPACING.xl * 2,
  },
  loadingText: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: SPACING.sm,
    marginBottom: SPACING.xs,
  },
  closeButton: {
    padding: SPACING.xs,
  },
  topBarTitle: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textMuted,
    letterSpacing: 1,
    fontWeight: "700",
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: "#F8FAFC",
    textAlign: "center",
    marginBottom: SPACING.xs,
  },
  headerSubtitle: {
    ...TYPOGRAPHY.body,
    fontSize: 15,
    color: "#94A3B8",
    textAlign: "center",
    marginBottom: SPACING.md,
  },
  statusIconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: SPACING.md,
  },
  warningBg: {
    backgroundColor: "#78350F",
    borderColor: "#D97706",
    borderWidth: 2,
  },
  summaryCard: {
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
    marginBottom: SPACING.lg,
  },
  summaryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SPACING.xs,
    gap: SPACING.sm,
    flexWrap: "wrap",
  },
  summaryLabel: {
    ...TYPOGRAPHY.subHeader,
    fontSize: 16,
    color: COLORS.textPrimary,
    flexShrink: 0,
  },

  terminalBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#7F1D1D",
    paddingHorizontal: SPACING.sm,
    paddingVertical: 6,
    borderRadius: 8,
    marginVertical: SPACING.xs,
  },
  terminalText: {
    ...TYPOGRAPHY.caption,
    color: "#FCA5A5",
    fontWeight: "600",
  },
  debugIdText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textMuted,
    marginTop: 4,
  },
  emptyCard: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: SPACING.xl,
    backgroundColor: COLORS.surface,
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
  timelineContainer: {
    paddingLeft: SPACING.xs,
  },
  timelineItem: {
    flexDirection: "row",
    marginBottom: SPACING.md,
  },
  nodeColumn: {
    alignItems: "center",
    marginRight: SPACING.md,
    width: 36,
  },
  nodeIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
  },
  connectingLine: {
    width: 2,
    flex: 1,
    backgroundColor: COLORS.border,
    marginTop: -4,
    marginBottom: -4,
  },
  eventContent: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: 12,
    padding: SPACING.md,
  },
  eventHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  eventBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  eventTimestamp: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textMuted,
    fontSize: 11,
  },
  eventDescription: {
    ...TYPOGRAPHY.body,
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: "600",
    marginBottom: SPACING.xs,
  },
  detailsBox: {
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 8,
    padding: SPACING.sm,
    marginTop: SPACING.xs,
  },
  detailRow: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textMuted,
    marginVertical: 1,
  },
  detailValue: {
    color: COLORS.textSecondary,
    fontWeight: "600",
  },
  errorContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: SPACING.xl,
  },
  errorTitle: {
    ...TYPOGRAPHY.subHeader,
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  errorSubtext: {
    ...TYPOGRAPHY.body,
    color: COLORS.textMuted,
    marginBottom: SPACING.lg,
  },
  retryButton: {
    backgroundColor: COLORS.surfaceLight,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
  },
  retryButtonText: {
    ...TYPOGRAPHY.cardTitle,
    color: COLORS.textPrimary,
  },
  primaryButton: {
    backgroundColor: COLORS.surfaceLight,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    marginTop: SPACING.md,
  },
  primaryButtonText: {
    ...TYPOGRAPHY.cardTitle,
    color: COLORS.textPrimary,
  },
  buttonPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
});
