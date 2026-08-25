import { StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, typography } from '@/theme';

type BudgetRowProps = {
  category: string;
  spent: string;
  limit: string;
  percent: number;
  color?: string;
};

export function BudgetRow({ category, spent, limit, percent, color = colors.brand.primary }: BudgetRowProps) {
  const normalizedPercent = Math.max(0, Math.min(percent, 100));

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.category}>{category}</Text>
        <Text style={styles.amount}>{spent} / {limit}</Text>
      </View>
      <View accessibilityLabel={`${category} budget ${normalizedPercent}%`} style={styles.track}>
        <View style={[styles.progress, { backgroundColor: color, width: `${normalizedPercent}%` }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  amount: {
    color: colors.content.muted,
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.semibold,
  },
  category: {
    color: colors.content.primary,
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.bold,
  },
  container: {
    gap: spacing[2] - 2,
    marginBottom: 14,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
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
