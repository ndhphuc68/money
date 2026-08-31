import { StyleSheet, Text, View } from 'react-native';
import { LineChart } from 'react-native-gifted-charts';

import { colors, radius, spacing, typography } from '@/theme';

export type ReportTrendChartPoint = {
  key: string;
  label: string;
  income: number;
  expense: number;
};

export type ReportTrendChartProps = {
  points: ReportTrendChartPoint[];
  incomeLegendLabel: string;
  expenseLegendLabel: string;
  emptyLabel: string;
};

export function ReportTrendChart({
  points,
  incomeLegendLabel,
  expenseLegendLabel,
  emptyLabel,
}: ReportTrendChartProps) {
  if (points.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>{emptyLabel}</Text>
      </View>
    );
  }

  const incomeData = points.map((point) => ({ value: point.income, label: point.label }));
  const expenseData = points.map((point) => ({ value: point.expense, label: point.label }));

  return (
    <View style={styles.container}>
      <View style={styles.chartWrapper}>
        <LineChart
          color1={colors.status.positive}
          color2={colors.status.negative}
          data={incomeData}
          data2={expenseData}
          height={160}
          thickness1={2}
          thickness2={2}
        />
      </View>
      <View style={styles.legendRow}>
        <LegendDot color={colors.status.positive} label={incomeLegendLabel} />
        <LegendDot color={colors.status.negative} label={expenseLegendLabel} />
      </View>
    </View>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <View style={styles.legendDotRow}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={styles.legendDotLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chartWrapper: {
    paddingVertical: spacing[2],
  },
  container: {
    gap: spacing[3],
  },
  dot: {
    borderRadius: radius.pill,
    height: 8,
    width: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[7],
  },
  emptyText: {
    color: colors.content.secondary,
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.medium,
    textAlign: 'center',
  },
  legendDotLabel: {
    color: colors.content.secondary,
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.semibold,
  },
  legendDotRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing[1],
  },
  legendRow: {
    flexDirection: 'row',
    gap: spacing[4],
    justifyContent: 'center',
  },
});
