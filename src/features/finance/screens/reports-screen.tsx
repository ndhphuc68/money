import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useContext } from 'react';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';

import { Card } from '@/components/base';
import {
  CategoryIcon,
  PeriodSelector,
  ReportCategoryChart,
  ReportIncomeExpenseChart,
} from '@/components/finance';
import type { ChangeTone, ReportsViewModel } from '@/features/finance/view-models/use-reports';
import type { Translate } from '@/i18n/translations';
import { colors, spacing, typography } from '@/theme';

export function ReportsScreen({ t, ...props }: ReportsViewModel & { t: Translate }) {
  const insets = useContext(SafeAreaInsetsContext) ?? { top: 0 };

  return (
    <ScrollView contentContainerStyle={[styles.container, { paddingTop: insets.top + 12 }]}>
      <Text style={styles.title}>{t('reportsTitle')}</Text>

      <PeriodSelector
        customFrom={props.customFrom}
        customTo={props.customTo}
        kind={props.periodKind}
        labels={{
          apply: t('reportsPeriodApply'),
          close: t('reportsPeriodClose'),
          custom: t('reportsPeriodCustom'),
          customFrom: t('reportsCustomFromLabel'),
          customTo: t('reportsCustomToLabel'),
          month: t('reportsPeriodMonth'),
          next: t('reportsNextPeriod'),
          previous: t('reportsPreviousPeriod'),
          quarter: t('reportsPeriodQuarter'),
          week: t('reportsPeriodWeek'),
          year: t('reportsPeriodYear'),
        }}
        onCustomFromChange={props.onCustomFromChange}
        onCustomToChange={props.onCustomToChange}
        onKindChange={props.onPeriodKindChange}
        onNext={props.onNextPeriod}
        onPrevious={props.onPreviousPeriod}
        rangeLabel={props.periodLabel}
      />

      {props.loading ? (
        <Text>{t('dashboardLoading')}</Text>
      ) : (
        <>
          <Card style={styles.summaryCard}>
            {props.comparison ? (
              <Text style={styles.comparisonCaption}>{t('reportsComparisonTitle')}</Text>
            ) : null}
            <SummaryRow
              amountLabel={props.incomeLabel}
              changeLabel={props.comparison?.incomeChangeLabel}
              changeTone={props.comparison?.incomeChangeTone}
              label={t('reportsIncomeLabel')}
            />
            <SummaryRow
              amountLabel={props.expenseLabel}
              changeLabel={props.comparison?.expenseChangeLabel}
              changeTone={props.comparison?.expenseChangeTone}
              label={t('reportsExpenseLabel')}
            />
            <View style={styles.divider} />
            <SummaryRow
              amountLabel={props.netLabel}
              changeLabel={props.comparison?.netChangeLabel}
              changeTone={props.comparison?.netChangeTone}
              label={t('reportsNetLabel')}
            />
          </Card>

          <Card style={styles.sectionCard}>
            <Text style={styles.heading}>{t('reportsTrendTitle')}</Text>
            <ReportIncomeExpenseChart
              emptyLabel={t('reportsIncomeExpenseEmpty')}
              expense={props.incomeExpenseChart.expense}
              expenseLabel={t('reportsExpenseLabel')}
              income={props.incomeExpenseChart.income}
              incomeLabel={t('reportsIncomeLabel')}
            />
          </Card>

          <Card style={styles.sectionCard}>
            <Text style={styles.heading}>{t('reportsCategoryTitle')}</Text>
            <ReportCategoryChart
              emptyLabel={t('reportsCategoryEmpty')}
              slices={props.categoryChartSlices}
            />
          </Card>

          <Totals
            compact
            empty={t('reportsAccountEmpty')}
            items={props.accountTotals}
            showEmpty={props.categoryChartSlices.length > 0}
            title={t('reportsAccountTitle')}
          />
        </>
      )}
    </ScrollView>
  );
}

function SummaryRow({
  label,
  amountLabel,
  changeLabel,
  changeTone,
}: {
  label: string;
  amountLabel: string;
  changeLabel?: string;
  changeTone?: ChangeTone;
}) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <View style={styles.amountWithChange}>
        <Text style={styles.amountText}>{amountLabel}</Text>
        {changeLabel ? <Text style={changeTextStyle(changeTone)}>{changeLabel}</Text> : null}
      </View>
    </View>
  );
}

function changeTextStyle(tone?: ChangeTone) {
  return {
    color:
      tone === 'positive'
        ? colors.status.positive
        : tone === 'negative'
          ? colors.status.negative
          : colors.content.secondary,
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.semibold,
  };
}

function Totals({
  title,
  empty,
  items,
  compact = false,
  showEmpty = true,
}: {
  title: string;
  empty: string;
  items: ReportsViewModel['accountTotals'];
  compact?: boolean;
  showEmpty?: boolean;
}) {
  return (
    <Card style={styles.sectionCard}>
      <Text style={styles.heading}>{title}</Text>
      {items.length ? (
        items.map((item) =>
          compact ? (
            <Text key={item.id}>{item.label}</Text>
          ) : (
            <View key={item.id} style={styles.row}>
              <View style={styles.itemInfo}>
                {item.icon ? <CategoryIcon color={item.color} icon={item.icon} size={28} /> : null}
                <Text style={styles.itemLabel}>{item.label}</Text>
              </View>
              <Text style={styles.itemAmount}>{item.amountLabel}</Text>
            </View>
          ),
        )
      ) : showEmpty ? (
        <Text>{empty}</Text>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  amountText: {
    color: colors.content.primary,
    fontSize: typography.sizes.bodyLg,
    fontWeight: typography.weights.bold,
  },
  amountWithChange: {
    alignItems: 'flex-end',
    gap: 2,
  },
  comparisonCaption: {
    color: colors.content.muted,
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.semibold,
  },
  container: {
    backgroundColor: colors.surface.canvas,
    flexGrow: 1,
    gap: spacing[4],
    padding: spacing[4],
  },
  divider: {
    backgroundColor: colors.border.subtle,
    height: StyleSheet.hairlineWidth,
  },
  heading: { fontWeight: typography.weights.bold },
  itemAmount: {
    color: colors.content.primary,
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.bold,
  },
  itemInfo: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing[2],
  },
  itemLabel: {
    color: colors.content.primary,
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.medium,
  },
  row: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  rowLabel: {
    color: colors.content.secondary,
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.medium,
  },
  sectionCard: {
    gap: spacing[3],
  },
  summaryCard: { gap: spacing[3] },
  title: {
    color: colors.content.primary,
    fontSize: typography.sizes.title,
    fontWeight: typography.weights.bold,
  },
});
