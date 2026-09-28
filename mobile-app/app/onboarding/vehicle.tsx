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
import { useVehicle } from "../../src/modules/vehicle/VehicleContext";
import { createVehicleApi } from "../../src/modules/vehicle/vehicle.service";
import { COLORS, SPACING, TYPOGRAPHY } from "../../src/theme/theme";

const VEHICLE_TYPES = [
  { label: "Sedan", value: "sedan" },
  { label: "SUV", value: "suv" },
  { label: "Truck", value: "truck" },
  { label: "Hatchback", value: "hatchback" },
  { label: "Coupe", value: "coupe" },
  { label: "Van", value: "van" },
  { label: "Motorcycle", value: "motorcycle" },
  { label: "Other", value: "other" },
];

export default function VehicleOnboardingScreen() {
  const { refreshVehicle } = useVehicle();

  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [year, setYear] = useState("");
  const [licensePlate, setLicensePlate] = useState("");
  const [vehicleType, setVehicleType] = useState("sedan");
  const [color, setColor] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const validateForm = (): boolean => {
    if (!make.trim()) {
      setErrorMessage("Please enter vehicle make.");
      return false;
    }

    if (!model.trim()) {
      setErrorMessage("Please enter vehicle model.");
      return false;
    }

    if (!year.trim()) {
      setErrorMessage("Please enter vehicle year.");
      return false;
    }

    const numYear = Number(year.trim());
    if (isNaN(numYear) || numYear < 1900 || numYear > 2035) {
      setErrorMessage("Please enter a valid 4-digit year (e.g. 2022).");
      return false;
    }

    if (!licensePlate.trim()) {
      setErrorMessage("Please enter license plate number.");
      return false;
    }

    if (!vehicleType) {
      setErrorMessage("Please select a vehicle type.");
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setIsSubmitting(true);
    setErrorMessage(null);

    const result = await createVehicleApi({
      make: make.trim(),
      model: model.trim(),
      year: Number(year.trim()),
      licensePlate: licensePlate.trim().toUpperCase(),
      vehicleType: vehicleType.toLowerCase(),
      color: color.trim() || undefined,
    });

    if (result.success) {
      // Refresh VehicleContext so active vehicle is resolved throughout the app
      await refreshVehicle();
      setIsSubmitting(false);
      router.replace("/(tabs)" as any);
    } else {
      setIsSubmitting(false);
      setErrorMessage(result.message || "Failed to register vehicle. Please try again.");
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
              <Ionicons name="car-sport-outline" size={40} color={COLORS.primary} />
            </View>
            <Text style={styles.title}>Vehicle Profile Setup</Text>
            <Text style={styles.subtitle}>Register your connected safety vehicle</Text>
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
            {/* Make */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Make</Text>
              <View style={styles.inputWrapper}>
                <Ionicons
                  name="car-outline"
                  size={20}
                  color={COLORS.textMuted}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Toyota, Honda, Ford"
                  placeholderTextColor={COLORS.textMuted}
                  value={make}
                  onChangeText={(text) => {
                    setMake(text);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  autoCapitalize="words"
                  autoCorrect={false}
                  editable={!isSubmitting}
                />
              </View>
            </View>

            {/* Model */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Model</Text>
              <View style={styles.inputWrapper}>
                <Ionicons
                  name="options-outline"
                  size={20}
                  color={COLORS.textMuted}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Camry, Civic, F-150"
                  placeholderTextColor={COLORS.textMuted}
                  value={model}
                  onChangeText={(text) => {
                    setModel(text);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  autoCapitalize="words"
                  autoCorrect={false}
                  editable={!isSubmitting}
                />
              </View>
            </View>

            {/* Year & License Plate Row */}
            <View style={styles.rowTwoCols}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.inputLabel}>Year</Text>
                <View style={styles.inputWrapper}>
                  <TextInput
                    style={styles.input}
                    placeholder="2022"
                    placeholderTextColor={COLORS.textMuted}
                    value={year}
                    onChangeText={(text) => {
                      setYear(text);
                      if (errorMessage) setErrorMessage(null);
                    }}
                    keyboardType="number-pad"
                    maxLength={4}
                    editable={!isSubmitting}
                  />
                </View>
              </View>

              <View style={[styles.inputGroup, { flex: 1.4 }]}>
                <Text style={styles.inputLabel}>License Plate</Text>
                <View style={styles.inputWrapper}>
                  <TextInput
                    style={styles.input}
                    placeholder="ABC-1234"
                    placeholderTextColor={COLORS.textMuted}
                    value={licensePlate}
                    onChangeText={(text) => {
                      setLicensePlate(text);
                      if (errorMessage) setErrorMessage(null);
                    }}
                    autoCapitalize="characters"
                    autoCorrect={false}
                    editable={!isSubmitting}
                  />
                </View>
              </View>
            </View>

            {/* Vehicle Type Selection */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Vehicle Type</Text>
              <View style={styles.typePillsGrid}>
                {VEHICLE_TYPES.map((item) => {
                  const isSelected = vehicleType === item.value;
                  return (
                    <Pressable
                      key={item.value}
                      style={[
                        styles.typePill,
                        isSelected && styles.typePillSelected,
                      ]}
                      onPress={() => {
                        setVehicleType(item.value);
                        if (errorMessage) setErrorMessage(null);
                      }}
                      disabled={isSubmitting}
                    >
                      <Text
                        style={[
                          styles.typePillText,
                          isSelected && styles.typePillTextSelected,
                        ]}
                      >
                        {item.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* Color (Optional) */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Color (Optional)</Text>
              <View style={styles.inputWrapper}>
                <Ionicons
                  name="color-palette-outline"
                  size={20}
                  color={COLORS.textMuted}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Silver, Black, Red"
                  placeholderTextColor={COLORS.textMuted}
                  value={color}
                  onChangeText={(text) => {
                    setColor(text);
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
              accessibilityLabel="Register Vehicle"
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.submitButtonText}>Register Vehicle</Text>
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
  rowTwoCols: {
    flexDirection: "row",
    gap: SPACING.md,
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
  typePillsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SPACING.xs + 2,
    marginTop: 2,
  },
  typePill: {
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs + 2,
  },
  typePillSelected: {
    backgroundColor: COLORS.primaryDark,
    borderColor: COLORS.primary,
  },
  typePillText: {
    ...TYPOGRAPHY.caption,
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: "500",
  },
  typePillTextSelected: {
    color: "#FFFFFF",
    fontWeight: "700",
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
