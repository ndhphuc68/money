import { StyleSheet, Text } from 'react-native';

import { Card } from '@/components/base';
import { colors, spacing, typography } from '@/theme';

type StatCardProps = {
  label: string;
  value: string;
  tone?: 'positive' | 'negative';
};

export function StatCard({ label, value, tone = 'positive' }: StatCardProps) {
  return (
    <Card padding={14} radius="md" style={styles.card}>
      <Text style={styles.label}>{label}</Text>
      <Text
        style={[
          styles.value,
          { color: tone === 'positive' ? colors.status.positive : colors.status.negative },
        ]}>
        {value}
      </Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minHeight: 68,
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
