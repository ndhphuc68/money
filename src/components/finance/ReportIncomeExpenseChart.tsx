import { StyleSheet, Text, View } from 'react-native';
import { PieChart } from 'react-native-gifted-charts';

import { formatVnd } from '@/core/domain/finance/money';
import { colors, radius, spacing, typography } from '@/theme';

export type ReportIncomeExpenseChartProps = {
  income: number;
  expense: number;
  incomeLabel: string;
  expenseLabel: string;
  emptyLabel: string;
};

export function ReportIncomeExpenseChart({
  income,
  expense,
  incomeLabel,
  expenseLabel,
  emptyLabel,
}: ReportIncomeExpenseChartProps) {
  if (income === 0 && expense === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>{emptyLabel}</Text>
      </View>
    );
  }

  const total = income + expense;
  const incomePercent = total > 0 ? Math.round((income / total) * 100) : 0;
  const expensePercent = total > 0 ? 100 - incomePercent : 0;

  const pieData = [
    { value: income, color: colors.status.positive },
    { value: expense, color: colors.status.negative },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.chartWrapper}>
        <PieChart data={pieData} donut innerRadius={56} radius={88} />
      </View>
      <View style={styles.legend}>
        <LegendRow
          amountLabel={formatVnd(income)}
          color={colors.status.positive}
          label={incomeLabel}
          percentLabel={`${incomePercent}%`}
        />
        <LegendRow
          amountLabel={formatVnd(expense)}
          color={colors.status.negative}
          divider
          label={expenseLabel}
          percentLabel={`${expensePercent}%`}
        />
      </View>
    </View>
  );
}

function LegendRow({
  color,
  label,
  percentLabel,
  amountLabel,
  divider,
}: {
  color: string;
  label: string;
  percentLabel: string;
  amountLabel: string;
  divider?: boolean;
}) {
  return (
    <View style={[styles.legendRow, divider && styles.legendRowDivider]}>
      <View style={styles.legendInfo}>
        <View style={[styles.dot, { backgroundColor: color }]} />
        <Text style={styles.legendLabel}>{label}</Text>
      </View>
      <View style={styles.legendAmounts}>
        <Text style={styles.legendAmount}>{amountLabel}</Text>
        <Text style={styles.legendPercent}>{percentLabel}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  chartWrapper: {
    alignItems: 'center',
    paddingVertical: spacing[3],
  },
  container: {
    gap: spacing[4],
  },
  dot: {
    borderRadius: radius.pill,
    height: 10,
    width: 10,
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
  legend: {
    gap: spacing[1],
  },
  legendAmount: {
    color: colors.content.primary,
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.bold,
  },
  legendAmounts: {
    alignItems: 'flex-end',
    gap: 2,
  },
  legendInfo: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing[2],
  },
  legendLabel: {
    color: colors.content.primary,
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.medium,
  },
  legendPercent: {
    color: colors.content.secondary,
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.semibold,
  },
  legendRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing[2],
  },
  legendRowDivider: {
    borderTopColor: colors.border.subtle,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
