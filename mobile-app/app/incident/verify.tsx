import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { COLORS, SPACING, TYPOGRAPHY } from "../../src/theme/theme";
import { API_BASE_URL } from "../../src/config/api.config";
import { authenticatedFetch } from "../../src/modules/auth/apiClient";

type VerificationState = "VERIFYING" | "RESPONSIVE" | "IMPAIRED" | "NO_RESPONSE";

export default function IncidentVerifyScreen() {
  const params = useLocalSearchParams<{ incidentId?: string }>();
  const rawIncidentId = Array.isArray(params.incidentId)
    ? params.incidentId[0]
    : params.incidentId;
  const incidentId = rawIncidentId?.trim();

  const [verificationState, setVerificationState] =
    useState<VerificationState>("VERIFYING");
  const [secondsRemaining, setSecondsRemaining] = useState<number>(10);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let timer: ReturnType<typeof setInterval>;
    if (verificationState === "VERIFYING" && secondsRemaining > 0 && !isSubmitting) {
      timer = setInterval(() => {
        setSecondsRemaining((prev) => {
          if (prev <= 1) {
            setVerificationState("NO_RESPONSE");
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [verificationState, secondsRemaining, isSubmitting]);

  const handleVerificationRequest = async (driverState: "RESPONSIVE" | "IMPAIRED") => {
    if (!incidentId || isSubmitting) return;

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const response = await authenticatedFetch(`${API_BASE_URL}/incidents/${incidentId}/verify`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ driverState }),
      });

      const data = await response.json();

      if (response.ok && data?.success) {
        setIsSubmitting(false);
        setVerificationState(driverState);
        if (driverState === "IMPAIRED") {
          router.push(`/incident/mobilizing?incidentId=${incidentId}` as any);
        }
      } else {
        setIsSubmitting(false);
        setErrorMessage(
          data?.message || "Unable to confirm your response. Please try again."
        );
      }
    } catch (error) {
      setIsSubmitting(false);
      setErrorMessage("Unable to connect to safety server. Please check your network and try again.");
    }
  };

  const handleSimulateNoResponse = () => {
    setSecondsRemaining(0);
    setVerificationState("NO_RESPONSE");
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
          <View style={[styles.resultIconCircle, styles.warningBg]}>
            <Ionicons name="alert-circle-outline" size={64} color="#F59E0B" />
          </View>
          <Text style={styles.resultTitle}>Incident Not Identified</Text>
          <Text style={styles.resultSubtitle}>
            No valid incident identifier was provided for verification.
          </Text>
          <Pressable
            style={({ pressed }) => [
              styles.returnButton,
              pressed && styles.buttonPressed,
            ]}
            onPress={handleResetOrReturn}
          >
            <Text style={styles.returnButtonText}>Return to Safety</Text>
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
        {/* Top Header / Bar */}
        <View style={styles.topBar}>
          <Pressable
            style={styles.closeButton}
            onPress={handleResetOrReturn}
            accessibilityLabel="Close verification"
            disabled={isSubmitting}
          >
            <Ionicons name="close" size={24} color={COLORS.textSecondary} />
          </Pressable>
          <Text style={styles.topBarTitle}>STATE 2 · AI VERIFICATION</Text>
        </View>

        {verificationState === "VERIFYING" && (
          <View style={styles.contentContainer}>
            {/* 1. EMERGENCY HEADER */}
            <View style={styles.headerContainer}>
              <Text style={styles.emergencyTitle}>Are you okay?</Text>
              <Text style={styles.emergencySubtitle}>
                We detected an unusual vehicle event.
              </Text>
            </View>

            {/* ERROR BANNER */}
            {errorMessage && (
              <View style={styles.errorBanner}>
                <Ionicons name="warning-outline" size={20} color="#FCA5A5" style={{ marginRight: SPACING.xs }} />
                <Text style={styles.errorBannerText}>{errorMessage}</Text>
              </View>
            )}

            {/* 2. STATUS INDICATOR */}
            <View style={styles.statusIndicatorContainer}>
              <View style={styles.warningIconCircle}>
                <Ionicons name="warning" size={48} color="#F59E0B" />
              </View>
              <Text style={styles.statusMessage}>Please confirm your condition.</Text>
            </View>

            {/* 3. RESPONSE TIMER / WAITING STATE */}
            <View style={styles.timerContainer}>
              <Text style={styles.timerLabel}>
                {isSubmitting ? "Processing Response" : "Waiting for your response"}
              </Text>
              {isSubmitting ? (
                <View style={styles.loadingRow}>
                  <ActivityIndicator size="small" color={COLORS.primary} style={{ marginRight: SPACING.xs }} />
                  <Text style={styles.loadingText}>Confirming with server...</Text>
                </View>
              ) : (
                <View style={styles.timerBadge}>
                  <Text style={styles.timerNumber}>{secondsRemaining}</Text>
                  <Text style={styles.timerSubtext}>seconds remaining</Text>
                </View>
              )}
            </View>

            {/* 4. PRIMARY ACTIONS */}
            <View style={styles.actionsContainer}>
              <Pressable
                style={({ pressed }) => [
                  styles.primaryButton,
                  isSubmitting && styles.buttonDisabled,
                  pressed && !isSubmitting && styles.buttonPressed,
                ]}
                onPress={() => handleVerificationRequest("RESPONSIVE")}
                disabled={isSubmitting}
                accessibilityRole="button"
                accessibilityLabel="I'm okay"
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" style={styles.buttonIcon} />
                ) : (
                  <Ionicons
                    name="checkmark-circle-outline"
                    size={28}
                    color="#FFFFFF"
                    style={styles.buttonIcon}
                  />
                )}
                <Text style={styles.primaryButtonText}>
                  {isSubmitting ? "Confirming..." : "I'm okay"}
                </Text>
              </Pressable>

              <Pressable
                style={({ pressed }) => [
                  styles.secondaryButton,
                  isSubmitting && styles.buttonDisabled,
                  pressed && !isSubmitting && styles.buttonPressed,
                ]}
                onPress={() => handleVerificationRequest("IMPAIRED")}
                disabled={isSubmitting}
                accessibilityRole="button"
                accessibilityLabel="I need help"
              >
                <Ionicons
                  name="alert-circle-outline"
                  size={28}
                  color="#FFFFFF"
                  style={styles.buttonIcon}
                />
                <Text style={styles.secondaryButtonText}>I need help</Text>
              </Pressable>
            </View>

            {/* Dev Preview Toggle */}
            <Pressable
              style={styles.devPreviewButton}
              onPress={handleSimulateNoResponse}
              disabled={isSubmitting}
            >
              <Text style={styles.devPreviewText}>
                [Dev Preview: Simulate No Response]
              </Text>
            </Pressable>
          </View>
        )}

        {verificationState === "RESPONSIVE" && (
          <View style={styles.resultContainer}>
            <View style={[styles.resultIconCircle, styles.successBg]}>
              <Ionicons name="checkmark-circle" size={64} color="#10B981" />
            </View>

            <Text style={styles.resultTitle}>You're marked as safe</Text>
            <Text style={styles.resultSubtitle}>
              Incident verification complete.
            </Text>

            <Pressable
              style={({ pressed }) => [
                styles.returnButton,
                pressed && styles.buttonPressed,
              ]}
              onPress={handleResetOrReturn}
            >
              <Text style={styles.returnButtonText}>Return to Safety</Text>
            </Pressable>
          </View>
        )}

        {verificationState === "IMPAIRED" && (
          <View style={styles.resultContainer}>
            <View style={[styles.resultIconCircle, styles.dangerBg]}>
              <Ionicons name="alert-circle" size={64} color="#EF4444" />
            </View>

            <Text style={styles.resultTitle}>Help requested</Text>
            <Text style={styles.resultSubtitle}>
              Additional assistance may be initiated.
            </Text>

            <Pressable
              style={({ pressed }) => [
                styles.returnButton,
                pressed && styles.buttonPressed,
              ]}
              onPress={handleResetOrReturn}
            >
              <Text style={styles.returnButtonText}>Return to Safety</Text>
            </Pressable>
          </View>
        )}

        {verificationState === "NO_RESPONSE" && (
          <View style={styles.resultContainer}>
            <View style={[styles.resultIconCircle, styles.warningBg]}>
              <Ionicons name="time" size={64} color="#F59E0B" />
            </View>

            <Text style={styles.resultTitle}>No response detected</Text>
            <Text style={styles.resultSubtitle}>
              We're preparing additional safety assistance.
            </Text>
            <Text style={styles.resultNote}>
              Response timeout reached (Local UI prototype).
            </Text>

            <Pressable
              style={({ pressed }) => [
                styles.returnButton,
                pressed && styles.buttonPressed,
              ]}
              onPress={handleResetOrReturn}
            >
              <Text style={styles.returnButtonText}>Return to Safety</Text>
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
    justifyContent: "space-between",
  },
  headerContainer: {
    alignItems: "center",
    marginVertical: SPACING.md,
  },
  emergencyTitle: {
    fontSize: 32,
    fontWeight: "800",
    color: "#F8FAFC",
    textAlign: "center",
    marginBottom: SPACING.xs,
  },
  emergencySubtitle: {
    ...TYPOGRAPHY.body,
    fontSize: 16,
    color: "#94A3B8",
    textAlign: "center",
    lineHeight: 22,
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
  statusIndicatorContainer: {
    alignItems: "center",
    marginVertical: SPACING.md,
  },
  warningIconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: "#451A03",
    borderColor: "#78350F",
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: SPACING.md,
  },
  statusMessage: {
    ...TYPOGRAPHY.subHeader,
    fontSize: 18,
    color: "#FBBF24",
    textAlign: "center",
  },
  timerContainer: {
    alignItems: "center",
    marginBottom: SPACING.lg,
    backgroundColor: "#1E293B",
    padding: SPACING.md,
    borderRadius: 16,
    borderColor: "#334155",
    borderWidth: 1,
  },
  timerLabel: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: SPACING.xs,
  },
  timerBadge: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: SPACING.xs,
  },
  timerNumber: {
    fontSize: 36,
    fontWeight: "800",
    color: COLORS.primary,
  },
  timerSubtext: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
    fontSize: 14,
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: SPACING.xs,
  },
  loadingText: {
    ...TYPOGRAPHY.body,
    color: COLORS.primary,
    fontWeight: "600",
  },
  actionsContainer: {
    gap: SPACING.md,
    marginBottom: SPACING.lg,
  },
  primaryButton: {
    backgroundColor: "#059669",
    borderRadius: 16,
    height: 64,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: SPACING.md,
  },
  secondaryButton: {
    backgroundColor: "#DC2626",
    borderRadius: 16,
    height: 64,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: SPACING.md,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  buttonIcon: {
    marginRight: SPACING.sm,
  },
  primaryButtonText: {
    fontSize: 20,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  secondaryButtonText: {
    fontSize: 20,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  devPreviewButton: {
    alignSelf: "center",
    padding: SPACING.xs,
    marginTop: SPACING.xs,
  },
  devPreviewText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textMuted,
    textDecorationLine: "underline",
  },
  resultContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: SPACING.xl,
  },
  resultIconCircle: {
    width: 104,
    height: 104,
    borderRadius: 52,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: SPACING.lg,
  },
  successBg: {
    backgroundColor: "#064E3B",
    borderColor: "#059669",
    borderWidth: 2,
  },
  dangerBg: {
    backgroundColor: "#7F1D1D",
    borderColor: "#DC2626",
    borderWidth: 2,
  },
  warningBg: {
    backgroundColor: "#78350F",
    borderColor: "#D97706",
    borderWidth: 2,
  },
  resultTitle: {
    fontSize: 26,
    fontWeight: "800",
    color: "#F8FAFC",
    textAlign: "center",
    marginBottom: SPACING.xs,
  },
  resultSubtitle: {
    ...TYPOGRAPHY.subHeader,
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: "center",
    marginBottom: SPACING.md,
  },
  resultNote: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textMuted,
    textAlign: "center",
    marginBottom: SPACING.xl,
  },
  returnButton: {
    backgroundColor: COLORS.surfaceLight,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    marginTop: SPACING.md,
  },
  returnButtonText: {
    ...TYPOGRAPHY.cardTitle,
    color: COLORS.textPrimary,
  },
});
