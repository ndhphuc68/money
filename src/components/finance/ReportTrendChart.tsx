import { useState } from 'react';
import { LayoutChangeEvent, StyleSheet, Text, View } from 'react-native';
import { LineChart } from 'react-native-gifted-charts';

import { formatVnd } from '@/core/domain/finance/money';
import { colors, radius, shadows, spacing, typography } from '@/theme';

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

function formatCompactVnd(amount: number): string {
  const abs = Math.abs(amount);
  if (abs >= 1_000_000) {
    const millions = amount / 1_000_000;
    return `${Number.isInteger(millions) ? millions : millions.toFixed(1)}tr`;
  }
  if (abs >= 1_000) {
    return `${Math.round(amount / 1_000)}k`;
  }
  return `${amount}`;
}

export function ReportTrendChart({
  points,
  incomeLegendLabel,
  expenseLegendLabel,
  emptyLabel,
}: ReportTrendChartProps) {
  const [chartWidth, setChartWidth] = useState(0);

  const handleLayout = (event: LayoutChangeEvent) => {
    setChartWidth(event.nativeEvent.layout.width);
  };

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
      <View onLayout={handleLayout} style={styles.chartWrapper}>
        {chartWidth > 0 ? (
          <LineChart
            adjustToWidth
            color1={colors.status.positive}
            color2={colors.status.negative}
            curved
            data={incomeData}
            data2={expenseData}
            dataPointsColor1={colors.status.positive}
            dataPointsColor2={colors.status.negative}
            dataPointsRadius1={3}
            dataPointsRadius2={3}
            formatYLabel={(label) => formatCompactVnd(Number(label))}
            height={140}
            hideOrigin
            hideRules={false}
            initialSpacing={spacing[3]}
            noOfSections={4}
            pointerConfig={{
              activatePointersOnLongPress: false,
              persistPointer: false,
              pointer1Color: colors.status.positive,
              pointer2Color: colors.status.negative,
              pointerLabelComponent: (
                items: { value: number }[],
                secondaryItems: { value: number }[],
                pointerIndex: number,
              ) => (
                <View style={styles.tooltip}>
                  <Text style={styles.tooltipLabel}>{points[pointerIndex]?.label}</Text>
                  <View style={styles.tooltipRow}>
                    <View
                      style={[styles.tooltipDot, { backgroundColor: colors.status.positive }]}
                    />
                    <Text style={styles.tooltipValue}>{formatVnd(items[0]?.value ?? 0)} đ</Text>
                  </View>
                  <View style={styles.tooltipRow}>
                    <View
                      style={[styles.tooltipDot, { backgroundColor: colors.status.negative }]}
                    />
                    <Text style={styles.tooltipValue}>
                      {formatVnd(secondaryItems[0]?.value ?? 0)} đ
                    </Text>
                  </View>
                </View>
              ),
              pointerStripColor: colors.border.strong,
              pointerStripWidth: 1,
              showPointerStrip: true,
            }}
            rulesColor={colors.divider}
            rulesType="solid"
            thickness1={2}
            thickness2={2}
            width={chartWidth}
            xAxisColor="transparent"
            xAxisLabelTextStyle={styles.axisLabel}
            yAxisColor="transparent"
            yAxisTextStyle={styles.axisLabel}
            yAxisThickness={0}
          />
        ) : null}
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
  axisLabel: {
    color: colors.content.faint,
    fontSize: typography.sizes.micro,
    fontWeight: typography.weights.medium,
  },
  chartWrapper: {
    paddingVertical: spacing[2],
    width: '100%',
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
  tooltip: {
    backgroundColor: colors.surface.primary,
    borderRadius: radius.sm,
    gap: spacing[1],
    padding: spacing[2],
    ...shadows.card,
  },
  tooltipDot: {
    borderRadius: radius.pill,
    height: 6,
    width: 6,
  },
  tooltipLabel: {
    color: colors.content.secondary,
    fontSize: typography.sizes.micro,
    fontWeight: typography.weights.bold,
    marginBottom: 2,
  },
  tooltipRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing[1],
  },
  tooltipValue: {
    color: colors.content.primary,
    fontSize: typography.sizes.micro,
    fontWeight: typography.weights.bold,
  },
});
