import { StyleSheet, Text, View } from 'react-native';
import { PieChart } from 'react-native-gifted-charts';

import { ChartEmptyState } from '@/components/base';
import { colors, spacing, typography } from '@/theme';

import { CategoryIcon } from './icons';

export type ReportCategoryChartSlice = {
  id: string;
  label: string;
  value: number;
  color: string;
  percentLabel: string;
  icon?: string;
};

export type ReportCategoryChartProps = {
  slices: ReportCategoryChartSlice[];
  emptyLabel: string;
};

export function ReportCategoryChart({ slices, emptyLabel }: ReportCategoryChartProps) {
  if (slices.length === 0) {
    return <ChartEmptyState message={emptyLabel} />;
  }

  const pieData = slices.map((slice) => ({ value: slice.value, color: slice.color }));

  return (
    <View style={styles.container}>
      <View style={styles.chartWrapper}>
        <PieChart data={pieData} donut innerRadius={56} radius={88} />
      </View>
      <View style={styles.legend}>
        {slices.map((slice, index) => (
          <View key={slice.id} style={[styles.legendRow, index > 0 && styles.legendRowDivider]}>
            <CategoryIcon color={slice.color} icon={slice.icon} size={32} />
            <Text numberOfLines={1} style={styles.legendLabel}>
              {slice.label}
            </Text>
            <Text style={styles.legendPercent}>{slice.percentLabel}</Text>
          </View>
        ))}
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
  legend: {
    gap: spacing[1],
  },
  legendLabel: {
    color: colors.content.primary,
    flex: 1,
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
    gap: spacing[3],
    paddingVertical: spacing[2],
  },
  legendRowDivider: {
    borderTopColor: colors.border.subtle,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
