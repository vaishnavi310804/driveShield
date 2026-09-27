export const COLORS = {
  background: '#0B0F19',
  surface: '#1E293B',
  surfaceLight: '#334155',
  border: '#334155',
  borderLight: '#475569',
  
  textPrimary: '#F8FAFC',
  textSecondary: '#94A3B8',
  textMuted: '#64748B',

  primary: '#38BDF8',
  primaryDark: '#0284C7',
  
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  info: '#6366F1',

  tabBar: '#0F172A',
  tabActive: '#38BDF8',
  tabInactive: '#64748B',
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};

export const TYPOGRAPHY = {
  header: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: COLORS.textPrimary,
  },
  subHeader: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: COLORS.textPrimary,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: COLORS.textPrimary,
  },
  body: {
    fontSize: 14,
    fontWeight: '400' as const,
    color: COLORS.textSecondary,
  },
  caption: {
    fontSize: 12,
    fontWeight: '400' as const,
    color: COLORS.textMuted,
  },
};
