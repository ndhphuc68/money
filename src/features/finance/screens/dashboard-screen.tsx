import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { BalanceCard, StatCard, TransactionRow } from '@/components/finance';
import type { DashboardViewModel } from '@/features/finance/view-models/use-dashboard';
import type { Translate } from '@/i18n/translations';
import { colors, radius, shadows, spacing, typography } from '@/theme';

type DashboardScreenProps = DashboardViewModel & {
  t: Translate;
  onOpenTransactions(): void;
  onAddTransaction(): void;
  onSelectTransaction(id: string): void;
  /**
   * Optional: temporary reachability for the Task 5 sync screen, mirroring
   * the link `DashboardPlaceholder` (Task 7) used to provide before this
   * screen replaced it. Omit once Task 9 adds a proper Settings entry point.
   */
  onOpenSync?(): void;
  onOpenReports?(): void;
  onOpenSettings?(): void;
};

export function DashboardScreen(props: DashboardScreenProps) {
  const {
    loading,
    amountsHidden,
    toggleAmountsHidden,
    totalBalanceLabel,
    accountCountLabel,
    asOfLabel,
    incomeLabel,
    expenseLabel,
    netLabel,
    netTone,
    categorySpending,
    recentTransactions,
    onOpenTransactions,
    onAddTransaction,
    onSelectTransaction,
    onOpenSync,
    onOpenReports,
    onOpenSettings,
    t,
  } = props;

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.title}>{t('dashboardLoading')}</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <BalanceCard
        balance={totalBalanceLabel}
        cardNumber={accountCountLabel}
        expiry={asOfLabel}
        hideBalanceLabel={t('balanceHide')}
        label={t('dashboardBalanceLabel')}
        showBalanceLabel={t('balanceShow')}
        masked={amountsHidden}
        onToggleMask={toggleAmountsHidden}
      />

      <View style={styles.statsRow}>
        <StatCard label={t('dashboardIncomeLabel')} tone="positive" value={incomeLabel} />
        <StatCard label={t('dashboardExpenseLabel')} tone="negative" value={expenseLabel} />
        <StatCard label={t('dashboardNetLabel')} tone={netTone} value={netLabel} />
      </View>

      <Pressable
        accessibilityLabel={t('dashboardAddTransaction')}
        accessibilityRole="button"
        onPress={onAddTransaction}
        style={({ pressed }) => [styles.primaryAction, pressed && styles.primaryActionPressed]}
      >
        <Text style={styles.primaryActionText}>{t('dashboardAddTransaction')}</Text>
      </Pressable>

      <Section title={t('dashboardCategorySpendingTitle')}>
        {categorySpending.length === 0 ? (
          <Text style={styles.emptyText}>{t('dashboardCategorySpendingEmpty')}</Text>
        ) : (
          categorySpending.map((entry) => (
            <View key={entry.id} style={styles.categoryRow}>
              <Text numberOfLines={1} style={styles.categoryLabel}>{entry.label}</Text>
              <Text style={styles.categoryAmount}>{entry.amountLabel}</Text>
            </View>
          ))
        )}
      </Section>

      <Section
        action={
          <Pressable accessibilityLabel={t('dashboardViewAllTransactions')} accessibilityRole="button" onPress={onOpenTransactions}>
            <Text style={styles.sectionAction}>{t('dashboardViewAllTransactions')}</Text>
          </Pressable>
        }
        title={t('dashboardRecentTransactionsTitle')}
      >
        {recentTransactions.length === 0 ? (
          <Text style={styles.emptyText}>{t('dashboardRecentTransactionsEmpty')}</Text>
        ) : (
          recentTransactions.map((item, index) => (
            <Pressable accessibilityRole="button" key={item.id} onPress={() => onSelectTransaction(item.id)}>
              <TransactionRow
                amount={item.amountLabel}
                category={item.categoryLabel}
                icon={item.icon}
                meta={item.meta}
                name={item.name}
                positive={item.positive}
                showDivider={index < recentTransactions.length - 1}
              />
            </Pressable>
          ))
        )}
      </Section>

      {onOpenSync ? (
        <Pressable accessibilityLabel={t('dashboardSyncLink')} accessibilityRole="link" onPress={onOpenSync} style={styles.syncLink}>
          <Text style={styles.syncLinkText}>{t('dashboardSyncLink')}</Text>
        </Pressable>
      ) : null}
      <View style={styles.quickLinks}>
        {onOpenReports ? <Pressable accessibilityLabel={t('navReports')} onPress={onOpenReports}><Text style={styles.sectionAction}>{t('navReports')}</Text></Pressable> : null}
        {onOpenSettings ? <Pressable accessibilityLabel={t('navSettings')} onPress={onOpenSettings}><Text style={styles.sectionAction}>{t('navSettings')}</Text></Pressable> : null}
      </View>
    </ScrollView>
  );
}

function Section({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {action ?? null}
      </View>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  categoryAmount: {
    color: colors.content.primary,
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.bold,
  },
  categoryLabel: {
    color: colors.content.secondary,
    flex: 1,
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.semibold,
    marginRight: spacing[3],
  },
  categoryRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 40,
  },
  container: {
    backgroundColor: colors.surface.canvas,
    flexGrow: 1,
    gap: spacing[4],
    padding: spacing[4],
  },
  emptyText: {
    color: colors.content.muted,
    fontSize: typography.sizes.body,
  },
  loadingContainer: {
    alignItems: 'center',
    backgroundColor: colors.surface.canvas,
    flex: 1,
    justifyContent: 'center',
  },
  primaryAction: {
    alignItems: 'center',
    backgroundColor: colors.brand.primary,
    borderRadius: radius.sm,
    justifyContent: 'center',
    minHeight: 52,
  },
  primaryActionPressed: {
    backgroundColor: colors.brand.primaryPressed,
  },
  primaryActionText: {
    color: colors.content.inverse,
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.bold,
  },
  quickLinks: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: spacing[2],
  },
  section: {
    ...shadows.card,
    backgroundColor: colors.surface.primary,
    borderRadius: radius.lg,
    padding: spacing[4],
  },
  sectionAction: {
    color: colors.brand.primaryPressed,
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.semibold,
  },
  sectionBody: {
    gap: spacing[2],
  },
  sectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing[3],
  },
  sectionTitle: {
    color: colors.content.primary,
    fontSize: typography.sizes.bodyLg,
    fontWeight: typography.weights.bold,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing[3],
  },
  syncLink: {
    alignItems: 'center',
    minHeight: 36,
    paddingVertical: spacing[2],
  },
  syncLinkText: {
    color: colors.content.muted,
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.semibold,
    textDecorationLine: 'underline',
  },
  title: {
    color: colors.content.primary,
    fontSize: typography.sizes.title,
    fontWeight: typography.weights.bold,
  },
});
