import { StyleSheet, Text, View } from 'react-native';

import { colors, radius, shadows, spacing, typography } from '@/theme';

type StatCardProps = {
  label: string;
  value: string;
  tone?: 'positive' | 'negative';
};

export function StatCard({ label, value, tone = 'positive' }: StatCardProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.label}>{label}</Text>
      <Text
        style={[
          styles.value,
          { color: tone === 'positive' ? colors.status.positive : colors.status.negative },
        ]}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    ...shadows.card,
    backgroundColor: colors.surface.primary,
    borderRadius: radius.md,
    flex: 1,
    minHeight: 68,
    padding: 14,
  },
  label: {
    color: colors.content.muted,
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.semibold,
    marginBottom: spacing[2] - 2,
  },
  value: {
    fontSize: typography.sizes.bodyLg,
    fontWeight: typography.weights.black,
  },
});
