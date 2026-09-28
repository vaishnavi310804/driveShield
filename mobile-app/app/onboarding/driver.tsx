import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useAuth } from "../../src/modules/auth/AuthContext";
import { createDriverApi } from "../../src/modules/driver/driver.service";
import { COLORS, SPACING, TYPOGRAPHY } from "../../src/theme/theme";

export default function DriverOnboardingScreen() {
  const { restoreSession } = useAuth();

  const [licenseNumber, setLicenseNumber] = useState("");
  const [phone, setPhone] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactRelation, setContactRelation] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const validateForm = (): boolean => {
    if (!licenseNumber.trim()) {
      setErrorMessage("Please enter your driver license number.");
      return false;
    }

    if (!phone.trim()) {
      setErrorMessage("Please enter your phone number.");
      return false;
    }

    if (!contactName.trim()) {
      setErrorMessage("Please enter an emergency contact name.");
      return false;
    }

    if (!contactPhone.trim()) {
      setErrorMessage("Please enter an emergency contact phone number.");
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setIsSubmitting(true);
    setErrorMessage(null);

    const result = await createDriverApi({
      licenseNumber: licenseNumber.trim(),
      phone: phone.trim(),
      emergencyContact: {
        name: contactName.trim(),
        phone: contactPhone.trim(),
        relationship: contactRelation.trim() || undefined,
      },
    });

    if (result.success) {
      // Refresh authenticated session so user.driverId is updated
      await restoreSession();
      setIsSubmitting(false);
      router.replace("/onboarding/vehicle" as any);
    } else {
      setIsSubmitting(false);
      setErrorMessage(result.message || "Failed to create driver profile. Please try again.");
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom", "left", "right"]}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header Icon & Title */}
          <View style={styles.headerContainer}>
            <View style={styles.iconCircle}>
              <Ionicons name="card-outline" size={40} color={COLORS.primary} />
            </View>
            <Text style={styles.title}>Driver Profile Setup</Text>
            <Text style={styles.subtitle}>Complete your driver details to enable safety monitoring</Text>
          </View>

          {/* Error Banner */}
          {errorMessage && (
            <View style={styles.errorBanner}>
              <Ionicons
                name="alert-circle-outline"
                size={20}
                color="#FCA5A5"
                style={styles.errorIcon}
              />
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          )}

          {/* Form */}
          <View style={styles.formContainer}>
            {/* License Number */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>License Number</Text>
              <View style={styles.inputWrapper}>
                <Ionicons
                  name="id-card-outline"
                  size={20}
                  color={COLORS.textMuted}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="e.g. DL-987654321"
                  placeholderTextColor={COLORS.textMuted}
                  value={licenseNumber}
                  onChangeText={(text) => {
                    setLicenseNumber(text);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  editable={!isSubmitting}
                />
              </View>
            </View>

            {/* Phone Number */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Phone Number</Text>
              <View style={styles.inputWrapper}>
                <Ionicons
                  name="call-outline"
                  size={20}
                  color={COLORS.textMuted}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="e.g. +1 555 010 1234"
                  placeholderTextColor={COLORS.textMuted}
                  value={phone}
                  onChangeText={(text) => {
                    setPhone(text);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  keyboardType="phone-pad"
                  editable={!isSubmitting}
                />
              </View>
            </View>

            {/* Emergency Contact Header */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Emergency Contact</Text>
              <Text style={styles.sectionSubtitle}>Primary contact in case of safety events</Text>
            </View>

            {/* Emergency Contact Name */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Contact Name</Text>
              <View style={styles.inputWrapper}>
                <Ionicons
                  name="person-outline"
                  size={20}
                  color={COLORS.textMuted}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Jordan Morgan"
                  placeholderTextColor={COLORS.textMuted}
                  value={contactName}
                  onChangeText={(text) => {
                    setContactName(text);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  autoCapitalize="words"
                  editable={!isSubmitting}
                />
              </View>
            </View>

            {/* Emergency Contact Phone */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Contact Phone</Text>
              <View style={styles.inputWrapper}>
                <Ionicons
                  name="call-outline"
                  size={20}
                  color={COLORS.textMuted}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="e.g. +1 555 010 5678"
                  placeholderTextColor={COLORS.textMuted}
                  value={contactPhone}
                  onChangeText={(text) => {
                    setContactPhone(text);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  keyboardType="phone-pad"
                  editable={!isSubmitting}
                />
              </View>
            </View>

            {/* Emergency Contact Relationship (Optional) */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Relationship (Optional)</Text>
              <View style={styles.inputWrapper}>
                <Ionicons
                  name="people-outline"
                  size={20}
                  color={COLORS.textMuted}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Spouse / Parent / Sibling"
                  placeholderTextColor={COLORS.textMuted}
                  value={contactRelation}
                  onChangeText={(text) => {
                    setContactRelation(text);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  autoCapitalize="words"
                  editable={!isSubmitting}
                />
              </View>
            </View>

            {/* Submit Button */}
            <Pressable
              style={({ pressed }) => [
                styles.submitButton,
                isSubmitting && styles.buttonDisabled,
                pressed && !isSubmitting && styles.buttonPressed,
              ]}
              onPress={handleSubmit}
              disabled={isSubmitting}
              accessibilityRole="button"
              accessibilityLabel="Complete Profile Setup"
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.submitButtonText}>Complete Setup</Text>
              )}
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.xl,
    flexGrow: 1,
    justifyContent: "center",
  },
  headerContainer: {
    alignItems: "center",
    marginBottom: SPACING.lg,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: SPACING.md,
  },
  title: {
    ...TYPOGRAPHY.header,
    fontSize: 24,
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
    textAlign: "center",
  },
  subtitle: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
    fontSize: 14,
    textAlign: "center",
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#7F1D1D",
    borderColor: COLORS.danger,
    borderWidth: 1,
    borderRadius: 12,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
  },
  errorIcon: {
    marginRight: SPACING.sm,
  },
  errorText: {
    ...TYPOGRAPHY.body,
    color: "#FCA5A5",
    flex: 1,
    fontSize: 13,
  },
  formContainer: {
    gap: SPACING.md,
  },
  sectionHeader: {
    marginTop: SPACING.sm,
    marginBottom: -SPACING.xs,
  },
  sectionTitle: {
    ...TYPOGRAPHY.subHeader,
    fontSize: 16,
    color: COLORS.textPrimary,
  },
  sectionSubtitle: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  inputGroup: {
    gap: SPACING.xs,
  },
  inputLabel: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: SPACING.md,
    height: 52,
  },
  inputIcon: {
    marginRight: SPACING.sm,
  },
  input: {
    flex: 1,
    color: COLORS.textPrimary,
    fontSize: 15,
  },
  submitButton: {
    backgroundColor: COLORS.primaryDark,
    borderRadius: 12,
    height: 52,
    alignItems: "center",
    justifyContent: "center",
    marginTop: SPACING.md,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.99 }],
  },
  submitButtonText: {
    ...TYPOGRAPHY.cardTitle,
    fontSize: 16,
    color: "#FFFFFF",
    fontWeight: "700",
  },
});
