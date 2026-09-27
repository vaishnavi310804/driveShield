import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { COLORS, SPACING, TYPOGRAPHY } from '../theme/theme';

interface CardProps {
  title?: string;
  subtitle?: string;
  children?: React.ReactNode;
  style?: ViewStyle;
}

export const Card: React.FC<CardProps> = ({ title, subtitle, children, style }) => {
  return (
    <View style={[styles.card, style]}>
      {title ? (
        <View style={styles.header}>
          <Text style={TYPOGRAPHY.cardTitle}>{title}</Text>
          {subtitle ? <Text style={TYPOGRAPHY.caption}>{subtitle}</Text> : null}
        </View>
      ) : null}
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: 12,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  header: {
    marginBottom: SPACING.sm,
  },
});
