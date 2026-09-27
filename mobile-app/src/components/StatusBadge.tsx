import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, SPACING } from '../theme/theme';

interface StatusBadgeProps {
  label: string;
  type?: 'success' | 'warning' | 'danger' | 'info' | 'neutral';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ label, type = 'neutral' }) => {
  const getColors = () => {
    switch (type) {
      case 'success':
        return { bg: '#064E3B', text: '#34D399', dot: '#10B981' };
      case 'warning':
        return { bg: '#78350F', text: '#FBBF24', dot: '#F59E0B' };
      case 'danger':
        return { bg: '#7F1D1D', text: '#FCA5A5', dot: '#EF4444' };
      case 'info':
        return { bg: '#1E1B4B', text: '#A5B4FC', dot: '#6366F1' };
      case 'neutral':
      default:
        return { bg: '#1E293B', text: '#94A3B8', dot: '#64748B' };
    }
  };

  const colors = getColors();

  return (
    <View style={[styles.badge, { backgroundColor: colors.bg }]}>
      <View style={[styles.dot, { backgroundColor: colors.dot }]} />
      <Text style={[styles.text, { color: colors.text }]} numberOfLines={1} ellipsizeMode="tail">
        {label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: 20,
    alignSelf: 'flex-start',
    flexShrink: 1,
    maxWidth: '100%',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
    flexShrink: 0,
  },
  text: {
    fontSize: 12,
    fontWeight: '600',
    flexShrink: 1,
  },
});

