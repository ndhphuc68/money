import { StyleSheet, Text, View } from 'react-native';

import { colors, radius, shadows, spacing, typography } from '@/theme';

type GoalCardProps = {
  name: string;
  initials: string;
  color?: string;
  due: string;
  percent: number;
  saved: string;
  target: string;
  accessibilityLabel: string;
};

export function GoalCard({ name, initials, color = colors.brand.primary, due, percent, saved, target, accessibilityLabel }: GoalCardProps) {
  const normalizedPercent = Math.max(0, Math.min(percent, 100));

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={[styles.avatar, { backgroundColor: color }]}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <View style={styles.copy}>
          <Text numberOfLines={1} style={styles.name}>{name}</Text>
          <Text style={styles.due}>{due}</Text>
        </View>
        <Text style={styles.percent}>{normalizedPercent}%</Text>
      </View>
      <View accessibilityLabel={accessibilityLabel} style={styles.track}>
        <View style={[styles.progress, { backgroundColor: color, width: `${normalizedPercent}%` }]} />
      </View>
      <View style={styles.footer}>
        <Text numberOfLines={1} style={styles.footerText}>{saved}</Text>
        <Text numberOfLines={1} style={styles.footerText}>{target}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: {
    alignItems: 'center',
    borderRadius: radius.circle,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  avatarText: {
    color: colors.content.inverse,
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.black,
  },
  card: {
    ...shadows.card,
    backgroundColor: colors.surface.primary,
    borderRadius: radius.lg,
    padding: spacing[4],
  },
  copy: {
    flex: 1,
    minWidth: 0,
  },
  due: {
    color: colors.content.muted,
    fontSize: 11,
    fontWeight: typography.weights.semibold,
    marginTop: 2,
  },
  footer: {
    flexDirection: 'row',
    gap: spacing[3],
    justifyContent: 'space-between',
    marginTop: spacing[2],
  },
  footerText: {
    color: colors.content.muted,
    flexShrink: 1,
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.semibold,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing[3],
    marginBottom: spacing[3],
  },
  name: {
    color: colors.content.primary,
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.black,
  },
  percent: {
    color: colors.content.primary,
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.black,
  },
  progress: {
    borderRadius: 3,
    height: 6,
  },
  track: {
    backgroundColor: colors.surface.muted,
    borderRadius: 3,
    height: 6,
    overflow: 'hidden',
  },
});
