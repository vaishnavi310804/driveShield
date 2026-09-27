import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, SPACING, TYPOGRAPHY } from '../theme/theme';

interface MetricItemProps {
  label: string;
  value: string;
}

export const MetricItem: React.FC<MetricItemProps> = ({ label, value }) => {
  return (
    <View style={styles.container}>
      <Text style={TYPOGRAPHY.caption}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.surfaceLight,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.xs,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 3,
  },
  value: {
    ...TYPOGRAPHY.cardTitle,
    color: COLORS.textPrimary,
    marginTop: 2,
    fontSize: 14,
  },
});
