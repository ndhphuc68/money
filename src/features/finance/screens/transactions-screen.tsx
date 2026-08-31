import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { FilterBar, TransactionRow, UndoBanner } from '@/components/finance';
import type { TransactionsViewModel } from '@/features/finance/view-models/use-transactions';
import type { Translate } from '@/i18n/translations';
import { colors, shadows, spacing, typography } from '@/theme';

type TransactionsScreenProps = TransactionsViewModel & {
  t: Translate;
  onBack(): void;
  onAddTransaction(): void;
  onSelectTransaction(id: string): void;
};

export function TransactionsScreen(props: TransactionsScreenProps) {
  const {
    loading,
    filters,
    setMonth,
    setType,
    setCategoryId,
    setAccountId,
    setSearch,
    categories,
    accounts,
    groups,
    isEmpty,
    undoMessage,
    undoDelete,
    dismissUndo,
    onSelectTransaction,
    t,
  } = props;

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>{t('transactionsTitle')}</Text>
        <FilterBar
          accountId={filters.accountId}
          accounts={accounts}
          categories={categories}
          categoryId={filters.categoryId}
          month={filters.month}
          onAccountChange={setAccountId}
          onCategoryChange={setCategoryId}
          onMonthChange={setMonth}
          onSearchChange={setSearch}
          onTypeChange={setType}
          compact
          search={filters.search}
          type={filters.type}
          labels={{
            account: t('filterAccount'),
            all: t('filterAll'),
            category: t('filterCategory'),
            expense: t('filterExpense'),
            income: t('filterIncome'),
            month: t('filterMonth'),
            nextMonth: t('filterNextMonth'),
            previousMonth: t('filterPreviousMonth'),
            searchLabel: t('filterSearchLabel'),
            searchPlaceholder: t('filterSearchPlaceholder'),
            transfer: t('filterTransfer'),
            advanced: t('filterAdvanced'),
          }}
        />

        {loading ? (
          <Text style={styles.emptyText}>{t('dashboardLoading')}</Text>
        ) : isEmpty ? (
          <Text style={styles.emptyText}>{t('transactionsEmpty')}</Text>
        ) : (
          groups.map((group) => (
            <View key={group.date} style={styles.group}>
              <Text style={styles.groupLabel}>{group.dateLabel}</Text>
              <View style={styles.groupCard}>
                {group.items.map((item, index) => (
                  <Pressable
                    accessibilityLabel={t('transactionsViewDetailLabel', { name: item.name })}
                    accessibilityRole="button"
                    key={item.id}
                    onPress={() => onSelectTransaction(item.id)}>
                    <TransactionRow
                      amount={item.amountLabel}
                      category={item.categoryLabel}
                      color={item.color}
                      icon={item.icon}
                      meta={item.meta}
                      name={item.name}
                      positive={item.positive}
                      showDivider={index < group.items.length - 1}
                    />
                  </Pressable>
                ))}
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {undoMessage ? (
        <UndoBanner
          message={undoMessage}
          onExpire={dismissUndo}
          onUndo={undoDelete}
          undoLabel={t('undoAction')}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing[3],
    padding: spacing[4],
    paddingBottom: spacing[4],
    paddingTop: 58,
  },
  emptyText: {
    color: colors.content.muted,
    fontSize: typography.sizes.body,
    textAlign: 'center',
  },
  group: {
    gap: spacing[2],
  },
  groupCard: {
    ...shadows.card,
    backgroundColor: colors.surface.primary,
    borderRadius: 16,
    paddingHorizontal: spacing[4],
  },
  groupLabel: {
    color: colors.content.muted,
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.semibold,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  root: {
    backgroundColor: colors.surface.canvas,
    flex: 1,
  },
  title: {
    color: colors.content.primary,
    fontSize: 22,
    fontWeight: typography.weights.black,
    lineHeight: 26,
  },
});
