import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useContext } from 'react';
import { Bell } from 'lucide-react-native';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';

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
    displayNameLabel,
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
  const insets = useContext(SafeAreaInsetsContext) ?? { top: 0 };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.title}>{t('dashboardLoading')}</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={[styles.container, { paddingTop: insets.top + 12 }]}>
      <View style={styles.greetingHeader}>
        <View style={styles.profileBlock}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{getInitials(displayNameLabel)}</Text>
          </View>
          <View>
            <Text style={styles.greeting}>{t('dashboardGreeting')}</Text>
            <Text style={styles.displayName}>{displayNameLabel}</Text>
          </View>
        </View>
        <Pressable
          accessibilityLabel={t('dashboardNotifications')}
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.notificationButton,
            pressed && styles.notificationButtonPressed,
          ]}>
          <Bell color={colors.content.primary} size={17} strokeWidth={2} />
        </Pressable>
      </View>
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
      </View>

      <Section
        action={
          <Pressable
            accessibilityLabel={t('dashboardViewAllTransactions')}
            accessibilityRole="button"
            onPress={onOpenTransactions}>
            <Text style={styles.sectionAction}>{t('dashboardViewAllTransactions')}</Text>
          </Pressable>
        }
        title={t('dashboardRecentTransactionsTitle')}>
        {recentTransactions.length === 0 ? (
          <Text style={styles.emptyText}>{t('dashboardRecentTransactionsEmpty')}</Text>
        ) : (
          recentTransactions.map((item, index) => (
            <Pressable
              accessibilityLabel={`${item.name} · ${item.amountLabel}`}
              accessibilityRole="button"
              key={item.id}
              onPress={() => onSelectTransaction(item.id)}>
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

      <Section title={t('dashboardCategorySpendingTitle')}>
        {categorySpending.length === 0 ? (
          <Text style={styles.emptyText}>{t('dashboardCategorySpendingEmpty')}</Text>
        ) : (
          categorySpending.map((entry) => (
            <View key={entry.id} style={styles.categoryRow}>
              <Text numberOfLines={1} style={styles.categoryLabel}>
                {entry.label}
              </Text>
              <Text style={styles.categoryAmount}>{entry.amountLabel}</Text>
            </View>
          ))
        )}
      </Section>
    </ScrollView>
  );
}

function getInitials(name: string): string {
  const initials = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('');
  return initials.toUpperCase() || 'V';
}

function Section({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
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
  avatar: {
    alignItems: 'center',
    backgroundColor: colors.brand.primary,
    borderRadius: radius.circle,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  avatarText: {
    color: colors.content.inverse,
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.black,
  },
  displayName: {
    color: colors.content.primary,
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.bold,
  },
  greeting: {
    color: colors.content.muted,
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.semibold,
  },
  greetingHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  notificationButton: {
    alignItems: 'center',
    backgroundColor: colors.surface.primary,
    borderRadius: radius.circle,
    height: 36,
    justifyContent: 'center',
    width: 36,
    ...shadows.card,
  },
  notificationButtonPressed: {
    opacity: 0.72,
  },
  profileBlock: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing[3],
  },
  title: {
    color: colors.content.primary,
    fontSize: typography.sizes.title,
    fontWeight: typography.weights.bold,
  },
});
