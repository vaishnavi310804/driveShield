import React, { useState, useEffect, useRef } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { Card } from "../../src/components/Card";
import { StatusBadge } from "../../src/components/StatusBadge";
import { COLORS, SPACING, TYPOGRAPHY } from "../../src/theme/theme";
import { API_BASE_URL } from "../../src/config/api.config";
import { authenticatedFetch } from "../../src/modules/auth/apiClient";

type MobilizingState =
  | "SEARCHING"
  | "RESPONDER_FOUND"
  | "RESPONDER_ACCEPTED"
  | "NO_RESPONDER"
  | "AUTHORITY_ESCALATED";

interface ResponderData {
  _id: string;
  name: string;
  distanceKm?: number;
}

export default function MobilizingScreen() {
  const params = useLocalSearchParams<{ incidentId?: string }>();
  const rawIncidentId = Array.isArray(params.incidentId)
    ? params.incidentId[0]
    : params.incidentId;
  const incidentId = rawIncidentId?.trim();

  const [mobilizingState, setMobilizingState] =
    useState<MobilizingState>("SEARCHING");
  const [isMobilizing, setIsMobilizing] = useState<boolean>(false);
  const [isAccepting, setIsAccepting] = useState<boolean>(false);
  const [isEscalating, setIsEscalating] = useState<boolean>(false);
  const [isUnableToAssist, setIsUnableToAssist] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [responder, setResponder] = useState<ResponderData | null>(null);
  const [dispatchId, setDispatchId] = useState<string | null>(null);

  const hasMobilizedRef = useRef<boolean>(false);

  useEffect(() => {
    if (incidentId && !hasMobilizedRef.current) {
      handleMobilize();
    }
  }, [incidentId]);

  const handleMobilize = async () => {
    if (!incidentId || isMobilizing) return;

    hasMobilizedRef.current = true;
    setIsMobilizing(true);
    setErrorMessage(null);

    try {
      const response = await authenticatedFetch(`${API_BASE_URL}/incidents/${incidentId}/mobilize`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();

      if (response.ok && data?.success) {
        setIsMobilizing(false);
        const responders = data?.data?.responders;
        const currentState = data?.data?.incident?.currentState;
        const responseStatus = data?.data?.incident?.communityResponseStatus;

        if (Array.isArray(responders) && responders.length > 0) {
          const topResponder = responders[0];
          setResponder({
            _id: topResponder._id,
            name: topResponder.name,
            distanceKm: topResponder.distanceKm,
          });
          setMobilizingState("RESPONDER_FOUND");
        } else if (
          currentState === "STATE 4B: AUTHORITY / EMERGENCY ESCALATION" ||
          responseStatus === "NO_COMMUNITY_RESPONDER_AVAILABLE" ||
          (Array.isArray(responders) && responders.length === 0)
        ) {
          setMobilizingState("NO_RESPONDER");
        } else {
          setMobilizingState("NO_RESPONDER");
        }
      } else {
        setIsMobilizing(false);
        hasMobilizedRef.current = false;
        setErrorMessage(data?.message || "Unable to mobilize responders. Please try again.");
      }
    } catch (err) {
      setIsMobilizing(false);
      hasMobilizedRef.current = false;
      setErrorMessage("Unable to connect to safety server. Please check network and try again.");
    }
  };

  const handleAcceptResponder = async () => {
    if (!incidentId || !responder?._id || isAccepting) return;

    setIsAccepting(true);
    setErrorMessage(null);

    try {
      const response = await authenticatedFetch(
        `${API_BASE_URL}/incidents/${incidentId}/responders/${responder._id}/accept`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      const data = await response.json();

      if (response.ok && data?.success) {
        setIsAccepting(false);
        setMobilizingState("RESPONDER_ACCEPTED");
      } else {
        setIsAccepting(false);
        setErrorMessage(data?.message || "Unable to confirm responder acceptance. Please try again.");
      }
    } catch (err) {
      setIsAccepting(false);
      setErrorMessage("Network error while confirming responder acceptance.");
    }
  };

  const handleResponderUnableToAssist = async () => {
    if (!incidentId || !responder?._id || isUnableToAssist || mobilizingState === "AUTHORITY_ESCALATED") return;

    setIsUnableToAssist(true);
    setErrorMessage(null);

    try {
      const response = await authenticatedFetch(
        `${API_BASE_URL}/incidents/${incidentId}/responders/${responder._id}/unable`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            reason: "Responder unable to assist",
          }),
        }
      );

      const data = await response.json();

      if (response.ok && data?.success) {
        setIsUnableToAssist(false);
        const returnedState = data?.data?.incident?.currentState;
        const returnedDispatchId = data?.data?.dispatchResult?.dispatchId;

        if (returnedState === "STATE 4B: AUTHORITY / EMERGENCY ESCALATION") {
          setDispatchId(returnedDispatchId || "CONFIRMED");
          setMobilizingState("AUTHORITY_ESCALATED");
        } else {
          setErrorMessage("Failure update processed but returned state is unexpected.");
        }
      } else {
        setIsUnableToAssist(false);
        setErrorMessage(data?.message || "Unable to report responder status. Please try again.");
      }
    } catch (err) {
      setIsUnableToAssist(false);
      setErrorMessage("Network error while reporting responder unable to assist.");
    }
  };

  const handleEscalateToAuthority = async () => {
    if (!incidentId || isEscalating || mobilizingState === "AUTHORITY_ESCALATED") return;

    setIsEscalating(true);
    setErrorMessage(null);

    try {
      const response = await authenticatedFetch(`${API_BASE_URL}/incidents/${incidentId}/escalate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();

      if (response.ok && data?.success) {
        setIsEscalating(false);
        const returnedState = data?.data?.incident?.currentState;
        const returnedDispatchId = data?.data?.dispatchResult?.dispatchId;

        if (returnedState === "STATE 4B: AUTHORITY / EMERGENCY ESCALATION") {
          setDispatchId(returnedDispatchId || "CONFIRMED");
          setMobilizingState("AUTHORITY_ESCALATED");
        } else {
          setErrorMessage("Escalation succeeded but returned state is unexpected.");
        }
      } else {
        setIsEscalating(false);
        setErrorMessage(data?.message || "Unable to contact emergency assistance. Please try again.");
      }
    } catch (err) {
      setIsEscalating(false);
      setErrorMessage("Network error while escalating to emergency assistance.");
    }
  };

  const handleResetOrReturn = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/" as any);
    }
  };

  // Missing incidentId guard view
  if (!incidentId) {
    return (
      <SafeAreaView style={styles.container} edges={["top", "bottom", "left", "right"]}>
        <View style={styles.errorGuardContainer}>
          <View style={[styles.statusIconCircle, styles.warningBg]}>
            <Ionicons name="alert-circle-outline" size={64} color="#F59E0B" />
          </View>
          <Text style={styles.headerTitle}>Incident Not Identified</Text>
          <Text style={styles.headerSubtitle}>
            No valid incident identifier was provided for community mobilization.
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

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom", "left", "right"]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Top Header / Navigation Bar */}
        <View style={styles.topBar}>
          <Pressable
            style={styles.closeButton}
            onPress={handleResetOrReturn}
            accessibilityLabel="Close mobilization view"
            disabled={isMobilizing || isAccepting || isEscalating || isUnableToAssist}
          >
            <Ionicons name="close" size={24} color={COLORS.textSecondary} />
          </Pressable>
          <Text style={styles.topBarTitle}>
            {mobilizingState === "AUTHORITY_ESCALATED"
              ? "STATE 4B · AUTHORITY ESCALATION"
              : "STATE 3 · COMMUNITY MOBILIZATION"}
          </Text>
        </View>

        {/* ERROR BANNER */}
        {errorMessage && (
          <View style={styles.errorBanner}>
            <Ionicons name="warning-outline" size={20} color="#FCA5A5" style={{ marginRight: SPACING.xs }} />
            <Text style={styles.errorBannerText}>{errorMessage}</Text>
            {mobilizingState === "SEARCHING" && (
              <Pressable style={styles.retryButton} onPress={handleMobilize}>
                <Text style={styles.retryButtonText}>Retry</Text>
              </Pressable>
            )}
          </View>
        )}

        {/* 1. SEARCHING STATE */}
        {mobilizingState === "SEARCHING" && (
          <View style={styles.contentContainer}>
            <View style={styles.headerContainer}>
              <Text style={styles.headerTitle}>Help is being arranged</Text>
              <Text style={styles.headerSubtitle}>
                We're looking for nearby responders who can assist you.
              </Text>
            </View>

            <View style={styles.statusIndicatorContainer}>
              <View style={[styles.statusIconCircle, styles.amberBg]}>
                <ActivityIndicator size="large" color="#F59E0B" />
              </View>
              <Text style={styles.statusBadgeText}>Finding nearby responders...</Text>
            </View>

            <Card style={styles.contextCard}>
              <View style={styles.contextRow}>
                <Text style={styles.contextLabel}>Incident:</Text>
                <StatusBadge label="Assistance requested" type="warning" />
              </View>
              <Text style={styles.debugIdText}>Ref ID: {incidentId}</Text>
            </Card>

            <View style={styles.safetyMessageContainer}>
              <Ionicons
                name="information-circle-outline"
                size={20}
                color={COLORS.primary}
                style={{ marginRight: SPACING.xs }}
              />
              <Text style={styles.safetyMessageText}>
                Stay where you are if it is safe to do so.
              </Text>
            </View>
          </View>
        )}

        {/* 2. RESPONDER FOUND STATE */}
        {mobilizingState === "RESPONDER_FOUND" && (
          <View style={styles.contentContainer}>
            <View style={styles.headerContainer}>
              <Text style={styles.headerTitle}>Responder found</Text>
              <Text style={styles.headerSubtitle}>
                A community responder has been notified.
              </Text>
            </View>

            <Card title="Community Responder" subtitle="Nearby assistance">
              <View style={styles.responderRow}>
                <View style={styles.responderAvatar}>
                  <Ionicons name="person" size={26} color={COLORS.primary} />
                </View>
                <View style={styles.responderDetails}>
                  <Text style={styles.responderName}>
                    {responder?.name || "Community Responder"}
                  </Text>
                  <Text style={styles.responderDistance}>
                    {responder?.distanceKm !== undefined
                      ? `${responder.distanceKm} km away`
                      : "Nearby"}
                  </Text>
                </View>
                <StatusBadge label="Available" type="info" />
              </View>
            </Card>

            <View style={styles.statusBanner}>
              <View style={styles.activeDot} />
              <Text style={styles.statusBannerText}>Waiting for responder</Text>
            </View>

            {/* ACTION TO ACCEPT RESPONDER */}
            {responder && (
              <Pressable
                style={({ pressed }) => [
                  styles.acceptButton,
                  isAccepting && styles.buttonDisabled,
                  pressed && !isAccepting && styles.buttonPressed,
                ]}
                onPress={handleAcceptResponder}
                disabled={isAccepting}
                accessibilityRole="button"
                accessibilityLabel="Confirm responder acceptance"
              >
                {isAccepting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" style={{ marginRight: SPACING.xs }} />
                ) : (
                  <Ionicons name="checkmark-circle-outline" size={22} color="#FFFFFF" style={{ marginRight: SPACING.xs }} />
                )}
                <Text style={styles.acceptButtonText}>
                  {isAccepting ? "Confirming responder..." : `Accept Responder (${responder.name})`}
                </Text>
              </Pressable>
            )}

            <Card style={styles.contextCard}>
              <View style={styles.contextRow}>
                <Text style={styles.contextLabel}>Incident:</Text>
                <StatusBadge label="Assistance requested" type="warning" />
              </View>
              <Text style={styles.debugIdText}>Ref ID: {incidentId}</Text>
            </Card>

            <View style={styles.safetyMessageContainer}>
              <Ionicons
                name="information-circle-outline"
                size={20}
                color={COLORS.primary}
                style={{ marginRight: SPACING.xs }}
              />
              <Text style={styles.safetyMessageText}>
                Stay where you are if it is safe to do so.
              </Text>
            </View>
          </View>
        )}

        {/* 3. RESPONDER ACCEPTED STATE */}
        {mobilizingState === "RESPONDER_ACCEPTED" && (
          <View style={styles.contentContainer}>
            <View style={styles.headerContainer}>
              <Text style={styles.headerTitle}>Help is on the way</Text>
              <Text style={styles.headerSubtitle}>
                {responder?.name || "Responder"} has accepted the request.
              </Text>
            </View>

            <Card title="Community Responder" style={styles.acceptedCard}>
              <View style={styles.responderRow}>
                <View style={[styles.responderAvatar, styles.greenAvatar]}>
                  <Ionicons name="checkmark-circle" size={26} color="#10B981" />
                </View>
                <View style={styles.responderDetails}>
                  <Text style={styles.responderName}>
                    {responder?.name || "Community Responder"}
                  </Text>
                  <Text style={styles.responderDistance}>
                    {responder?.distanceKm !== undefined
                      ? `${responder.distanceKm} km away · En route`
                      : "En route"}
                  </Text>
                </View>
                <StatusBadge label="Accepted" type="success" />
              </View>
            </Card>

            <View style={styles.statusBannerSuccess}>
              <Ionicons name="shield-checkmark" size={18} color="#34D399" style={{ marginRight: SPACING.xs }} />
              <Text style={styles.statusBannerSuccessText}>
                Community responder en route (STATE 4A)
              </Text>
            </View>

            {/* ACTION FOR RESPONDER UNABLE TO ASSIST */}
            <Pressable
              style={({ pressed }) => [
                styles.unableButton,
                isUnableToAssist && styles.buttonDisabled,
                pressed && !isUnableToAssist && styles.buttonPressed,
              ]}
              onPress={handleResponderUnableToAssist}
              disabled={isUnableToAssist}
              accessibilityRole="button"
              accessibilityLabel="Report unable to assist"
            >
              {isUnableToAssist ? (
                <ActivityIndicator size="small" color="#FFFFFF" style={{ marginRight: SPACING.xs }} />
              ) : (
                <Ionicons name="alert-circle-outline" size={20} color="#FFFFFF" style={{ marginRight: SPACING.xs }} />
              )}
              <Text style={styles.unableButtonText}>
                {isUnableToAssist ? "Reporting unable to assist..." : "Unable to Assist"}
              </Text>
            </Pressable>

            <Card style={styles.contextCard}>
              <View style={styles.contextRow}>
                <Text style={styles.contextLabel}>Incident:</Text>
                <StatusBadge label="Active Response" type="success" />
              </View>
              <Text style={styles.debugIdText}>Ref ID: {incidentId}</Text>
            </Card>

            <View style={styles.safetyMessageContainer}>
              <Ionicons
                name="information-circle-outline"
                size={20}
                color={COLORS.primary}
                style={{ marginRight: SPACING.xs }}
              />
              <Text style={styles.safetyMessageText}>
                Stay where you are if it is safe to do so.
              </Text>
            </View>
          </View>
        )}

        {/* 4. NO RESPONDER STATE */}
        {mobilizingState === "NO_RESPONDER" && (
          <View style={styles.contentContainer}>
            <View style={styles.headerContainer}>
              <Text style={styles.headerTitle}>No nearby responder available</Text>
              <Text style={styles.headerSubtitle}>
                We couldn't find an available community responder.
              </Text>
            </View>

            <View style={styles.statusIndicatorContainer}>
              <View style={[styles.statusIconCircle, styles.redBg]}>
                <Ionicons name="alert-circle" size={56} color="#EF4444" />
              </View>
            </View>

            <Pressable
              style={({ pressed }) => [
                styles.escalateButton,
                isEscalating && styles.buttonDisabled,
                pressed && !isEscalating && styles.buttonPressed,
              ]}
              onPress={handleEscalateToAuthority}
              disabled={isEscalating}
              accessibilityRole="button"
              accessibilityLabel="Continue to emergency assistance"
            >
              {isEscalating ? (
                <ActivityIndicator size="small" color="#FFFFFF" style={{ marginRight: SPACING.xs }} />
              ) : (
                <Ionicons name="alert-circle-outline" size={22} color="#FFFFFF" style={{ marginRight: SPACING.xs }} />
              )}
              <Text style={styles.escalateButtonText}>
                {isEscalating
                  ? "Contacting emergency assistance..."
                  : "Continue to emergency assistance"}
              </Text>
            </Pressable>

            <Card style={styles.contextCard}>
              <View style={styles.contextRow}>
                <Text style={styles.contextLabel}>Incident:</Text>
                <StatusBadge label="Escalation Required" type="danger" />
              </View>
              <Text style={styles.debugIdText}>Ref ID: {incidentId}</Text>
            </Card>

            <View style={styles.safetyMessageContainer}>
              <Ionicons
                name="information-circle-outline"
                size={20}
                color={COLORS.primary}
                style={{ marginRight: SPACING.xs }}
              />
              <Text style={styles.safetyMessageText}>
                Stay where you are if it is safe to do so.
              </Text>
            </View>
          </View>
        )}

        {/* 5. AUTHORITY ESCALATED STATE (TERMINAL STATE 4B) */}
        {mobilizingState === "AUTHORITY_ESCALATED" && (
          <View style={styles.contentContainer}>
            <View style={styles.headerContainer}>
              <Text style={styles.headerTitle}>Emergency assistance notified</Text>
              <Text style={styles.headerSubtitle}>
                Emergency assistance has been initiated for this incident.
              </Text>
            </View>

            <View style={styles.statusIndicatorContainer}>
              <View style={[styles.statusIconCircle, styles.dangerBg]}>
                <Ionicons name="shield-checkmark" size={56} color="#EF4444" />
              </View>
              <StatusBadge label="State 4B · Escalated" type="danger" />
            </View>

            <Card title="Emergency Dispatch Details" style={styles.escalatedCard}>
              <View style={styles.dispatchRow}>
                <Text style={styles.dispatchLabel}>Dispatch Status:</Text>
                <Text style={styles.dispatchValueConfirmed}>CONFIRMED (Simulated)</Text>
              </View>
              {dispatchId && (
                <View style={styles.dispatchRow}>
                  <Text style={styles.dispatchLabel}>Dispatch Ref:</Text>
                  <Text style={styles.dispatchValueRef}>{dispatchId}</Text>
                </View>
              )}
              <View style={styles.dispatchRow}>
                <Text style={styles.dispatchLabel}>Protocol:</Text>
                <Text style={styles.dispatchValue}>Authority Escalation Initiated</Text>
              </View>
            </Card>

            <Card style={styles.contextCard}>
              <View style={styles.contextRow}>
                <Text style={styles.contextLabel}>Incident:</Text>
                <StatusBadge label="Authority Escalated" type="danger" />
              </View>
              <Text style={styles.debugIdText}>Ref ID: {incidentId}</Text>
            </Card>

            <View style={styles.safetyMessageContainer}>
              <Ionicons
                name="information-circle-outline"
                size={20}
                color={COLORS.primary}
                style={{ marginRight: SPACING.xs }}
              />
              <Text style={styles.safetyMessageText}>
                Stay where you are if it is safe to do so.
              </Text>
            </View>

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
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: SPACING.sm,
    marginBottom: SPACING.md,
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
  contentContainer: {
    flex: 1,
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#7F1D1D",
    borderColor: "#EF4444",
    borderWidth: 1,
    borderRadius: 12,
    padding: SPACING.sm,
    marginBottom: SPACING.md,
  },
  errorBannerText: {
    ...TYPOGRAPHY.caption,
    color: "#FCA5A5",
    flex: 1,
    fontSize: 13,
  },
  retryButton: {
    backgroundColor: "#991B1B",
    borderRadius: 6,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    marginLeft: SPACING.xs,
  },
  retryButtonText: {
    ...TYPOGRAPHY.caption,
    color: "#FFFFFF",
    fontWeight: "600",
  },
  headerContainer: {
    alignItems: "center",
    marginVertical: SPACING.md,
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
    lineHeight: 22,
  },
  statusIndicatorContainer: {
    alignItems: "center",
    marginVertical: SPACING.lg,
  },
  statusIconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: SPACING.md,
  },
  amberBg: {
    backgroundColor: "#451A03",
    borderColor: "#78350F",
    borderWidth: 2,
  },
  redBg: {
    backgroundColor: "#7F1D1D",
    borderColor: "#DC2626",
    borderWidth: 2,
  },
  dangerBg: {
    backgroundColor: "#7F1D1D",
    borderColor: "#EF4444",
    borderWidth: 2,
  },
  warningBg: {
    backgroundColor: "#78350F",
    borderColor: "#D97706",
    borderWidth: 2,
  },
  statusBadgeText: {
    ...TYPOGRAPHY.subHeader,
    fontSize: 17,
    color: "#FBBF24",
    textAlign: "center",
  },
  responderRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  responderAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.surfaceLight,
    alignItems: "center",
    justifyContent: "center",
    marginRight: SPACING.md,
  },
  greenAvatar: {
    backgroundColor: "#064E3B",
  },
  responderDetails: {
    flex: 1,
  },
  responderName: {
    ...TYPOGRAPHY.cardTitle,
    fontSize: 16,
    color: COLORS.textPrimary,
  },
  responderDistance: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  acceptedCard: {
    borderColor: "#059669",
    borderWidth: 1.5,
  },
  escalatedCard: {
    borderColor: "#DC2626",
    borderWidth: 1.5,
    marginBottom: SPACING.md,
  },
  dispatchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: SPACING.xs,
  },
  dispatchLabel: {
    ...TYPOGRAPHY.body,
    color: COLORS.textMuted,
  },
  dispatchValue: {
    ...TYPOGRAPHY.body,
    fontWeight: "600",
    color: COLORS.textPrimary,
  },
  dispatchValueConfirmed: {
    ...TYPOGRAPHY.body,
    fontWeight: "700",
    color: "#FCA5A5",
  },
  dispatchValueRef: {
    ...TYPOGRAPHY.caption,
    fontWeight: "600",
    color: COLORS.primary,
  },
  statusBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: 12,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  statusBannerSuccess: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#063A2F",
    borderColor: "#065F46",
    borderWidth: 1.5,
    borderRadius: 12,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  activeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.warning,
    marginRight: SPACING.sm,
  },
  statusBannerText: {
    ...TYPOGRAPHY.body,
    fontSize: 14,
    color: COLORS.textPrimary,
    fontWeight: "500",
  },
  statusBannerSuccessText: {
    ...TYPOGRAPHY.body,
    fontSize: 14,
    color: "#6EE7B7",
    fontWeight: "600",
  },
  acceptButton: {
    backgroundColor: "#059669",
    borderRadius: 14,
    height: 54,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.md,
  },
  acceptButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  escalateButton: {
    backgroundColor: "#DC2626",
    borderRadius: 16,
    height: 60,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: SPACING.md,
    marginVertical: SPACING.md,
  },
  escalateButtonText: {
    fontSize: 17,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  contextCard: {
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
    marginTop: SPACING.xs,
    marginBottom: SPACING.md,
  },
  contextRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SPACING.xs,
  },
  contextLabel: {
    ...TYPOGRAPHY.body,
    color: COLORS.textMuted,
  },
  debugIdText: {
    ...TYPOGRAPHY.caption,
    fontSize: 12,
    color: COLORS.textMuted,
  },
  safetyMessageContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: 12,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
  },
  safetyMessageText: {
    ...TYPOGRAPHY.body,
    fontSize: 13,
    color: COLORS.textSecondary,
    flex: 1,
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
  unableButton: {
    backgroundColor: "#7F1D1D",
    borderColor: "#DC2626",
    borderWidth: 1,
    borderRadius: 14,
    height: 50,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.md,
  },
  unableButtonText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
});
