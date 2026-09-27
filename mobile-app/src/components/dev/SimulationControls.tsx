import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import {
  DriverStateSimulationMode,
  TransmissionStatus,
  VehicleSimulationMode,
} from '../../modules/telemetry';
import { COLORS, SPACING, TYPOGRAPHY } from '../../theme/theme';
import { Card } from '../Card';
import { StatusBadge } from '../StatusBadge';

export interface SimulationControlsProps {
  /** Currently selected vehicle simulation mode */
  vehicleMode: VehicleSimulationMode;
  /** Currently selected driver state simulation mode */
  driverMode: DriverStateSimulationMode;
  /** Callback triggered when user selects a vehicle mode */
  onSelectVehicleMode: (mode: VehicleSimulationMode) => void;
  /** Callback triggered when user selects a driver mode */
  onSelectDriverMode: (mode: DriverStateSimulationMode) => void;
  /** Transmission HTTP status */
  transmissionStatus?: TransmissionStatus;
  /** True when telemetry collector is actively running */
  isCollecting?: boolean;
  /** True when periodic network transmission is active */
  isTransmitting?: boolean;
  /** Timestamp of last successful HTTP POST transmission */
  lastSuccessTimestamp?: string | null;
}

const VEHICLE_MODES: { label: string; value: VehicleSimulationMode }[] = [
  { label: 'Normal', value: 'NORMAL' },
  { label: 'Stall', value: 'STALL' },
  { label: 'Critical Parameter', value: 'CRITICAL_PARAMETER' },
];

const DRIVER_MODES: { label: string; value: DriverStateSimulationMode }[] = [
  { label: 'Focused', value: 'FOCUSED' },
  { label: 'Drowsy', value: 'DROWSY' },
  { label: 'Distracted', value: 'DISTRACTED' },
  { label: 'Unresponsive', value: 'UNRESPONSIVE' },
];

/**
 * Development Simulation Controls Component.
 *
 * Provides a dev-only control surface on the Profile screen to dynamically switch
 * vehicle and driver telemetry simulation modes during development/demo evaluations.
 */
export const SimulationControls: React.FC<SimulationControlsProps> = ({
  vehicleMode,
  driverMode,
  onSelectVehicleMode,
  onSelectDriverMode,
  transmissionStatus = 'IDLE',
  isCollecting = false,
  isTransmitting = false,
  lastSuccessTimestamp = null,
}) => {
  const getStatusBadgeType = (status: TransmissionStatus) => {
    switch (status) {
      case 'SUCCESS':
        return 'success';
      case 'SENDING':
        return 'warning';
      case 'ERROR':
        return 'danger';
      default:
        return 'info';
    }
  };

  return (
    <Card style={styles.container}>
      {/* Dev Header Badge */}
      <View style={styles.headerContainer}>
        <View style={styles.devBadge}>
          <Text style={styles.devBadgeText}>[DEV ONLY CONTROL]</Text>
        </View>
        <Text style={styles.headerTitle}>Telemetry Simulation</Text>
      </View>

      <Text style={styles.headerSubtitle}>
        Switch simulation modes to test anomaly detection and emergency state machine transitions.
      </Text>

      {/* 1. VEHICLE SIMULATION MODE CONTROL */}
      <View style={styles.sectionContainer}>
        <Text style={styles.sectionTitle}>Vehicle Simulation Mode</Text>
        <View style={styles.buttonGroup}>
          {VEHICLE_MODES.map((modeItem) => {
            const isSelected = vehicleMode === modeItem.value;
            return (
              <TouchableOpacity
                key={modeItem.value}
                style={[
                  styles.optionButton,
                  isSelected && styles.optionButtonActive,
                ]}
                onPress={() => onSelectVehicleMode(modeItem.value)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.optionText,
                    isSelected && styles.optionTextActive,
                  ]}
                >
                  {modeItem.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* 2. DRIVER STATE SIMULATION MODE CONTROL */}
      <View style={styles.sectionContainer}>
        <Text style={styles.sectionTitle}>Driver Attention Mode</Text>
        <View style={styles.buttonGroupGrid}>
          {DRIVER_MODES.map((modeItem) => {
            const isSelected = driverMode === modeItem.value;
            return (
              <TouchableOpacity
                key={modeItem.value}
                style={[
                  styles.gridButton,
                  isSelected && styles.optionButtonActive,
                ]}
                onPress={() => onSelectDriverMode(modeItem.value)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.optionText,
                    isSelected && styles.optionTextActive,
                  ]}
                >
                  {modeItem.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* 3. LIVE PIPELINE STATUS INDICATOR */}
      <View style={styles.statusBox}>
        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>Telemetry Stream:</Text>
          <StatusBadge
            label={isCollecting ? 'Active (5 Hz)' : 'Stopped'}
            type={isCollecting ? 'success' : 'info'}
          />
        </View>

        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>Backend Transmission:</Text>
          <StatusBadge
            label={
              isTransmitting
                ? `HTTP POST (${transmissionStatus})`
                : 'Disabled'
            }
            type={getStatusBadgeType(transmissionStatus)}
          />
        </View>

        {lastSuccessTimestamp && (
          <Text style={styles.lastSuccessText}>
            Last Ingestion: {new Date(lastSuccessTimestamp).toLocaleTimeString()}
          </Text>
        )}
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1E232A',
    borderColor: '#3A424D',
    borderWidth: 1,
    marginBottom: SPACING.md,
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: SPACING.xs,
  },
  devBadge: {
    backgroundColor: '#FF9800',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  devBadgeText: {
    ...TYPOGRAPHY.caption,
    color: '#000000',
    fontWeight: 'bold',
    fontSize: 10,
  },
  headerTitle: {
    ...TYPOGRAPHY.cardTitle,
    fontSize: 16,
    color: '#FFFFFF',
  },
  headerSubtitle: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textMuted,
    marginBottom: SPACING.md,
  },
  sectionContainer: {
    marginBottom: SPACING.md,
  },
  sectionTitle: {
    ...TYPOGRAPHY.caption,
    color: '#A0AEC0',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: SPACING.xs,
    textTransform: 'uppercase',
  },
  buttonGroup: {
    flexDirection: 'row',
    gap: SPACING.xs,
  },
  buttonGroupGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs,
  },
  optionButton: {
    flex: 1,
    backgroundColor: '#2D3748',
    paddingVertical: SPACING.xs + 2,
    paddingHorizontal: SPACING.xs,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#4A5568',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridButton: {
    width: '48%',
    backgroundColor: '#2D3748',
    paddingVertical: SPACING.xs + 2,
    paddingHorizontal: SPACING.xs,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#4A5568',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  optionButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  optionText: {
    ...TYPOGRAPHY.caption,
    fontSize: 12,
    fontWeight: '600',
    color: '#CBD5E0',
  },
  optionTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  statusBox: {
    backgroundColor: '#171923',
    padding: SPACING.sm,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#2D3748',
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 2,
  },
  statusLabel: {
    ...TYPOGRAPHY.caption,
    color: '#A0AEC0',
    fontSize: 12,
  },
  lastSuccessText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.success,
    fontSize: 11,
    marginTop: 4,
    textAlign: 'right',
  },
});
