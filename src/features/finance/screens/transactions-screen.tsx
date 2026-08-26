import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ChevronLeft, Plus, X } from 'lucide-react-native';

import { FilterBar, TransactionRow, UndoBanner } from '@/components/finance';
import type { TransactionsViewModel } from '@/features/finance/view-models/use-transactions';
import type { Translate } from '@/i18n/translations';
import { colors, radius, shadows, spacing, typography } from '@/theme';

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
    deleteTransaction,
    undoDelete,
    dismissUndo,
    onBack,
    onAddTransaction,
    onSelectTransaction,
    t,
  } = props;

  function confirmDelete(id: string, name: string) {
    Alert.alert(
      t('transactionsDeleteConfirmTitle'),
      t('transactionsDeleteConfirmMessage', { name }),
      [
        { text: t('transactionsDeleteConfirmCancel'), style: 'cancel' },
        { text: t('transactionsDeleteConfirmConfirm'), style: 'destructive', onPress: () => deleteTransaction(id) },
      ],
    );
  }

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Pressable accessibilityLabel={t('transactionsBack')} accessibilityRole="button" onPress={onBack} style={styles.backButton}>
          <ChevronLeft color={colors.content.primary} size={24} strokeWidth={2.2} />
        </Pressable>
        <Text style={styles.title}>{t('transactionsTitle')}</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView contentContainerStyle={styles.container}>
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
                  <View key={item.id} style={styles.rowWrapper}>
                    <Pressable
                      accessibilityLabel={t('transactionsEditLabel', { name: item.name })}
                      accessibilityRole="button"
                      onPress={() => onSelectTransaction(item.id)}
                      style={styles.rowPressable}
                    >
                      <TransactionRow
                        amount={item.amountLabel}
                        category={item.categoryLabel}
                        icon={item.icon}
                        meta={item.meta}
                        name={item.name}
                        positive={item.positive}
                        showDivider={index < group.items.length - 1}
                      />
                    </Pressable>
                    <Pressable
                      accessibilityLabel={t('transactionsDeleteLabel', { name: item.name })}
                      accessibilityRole="button"
                      onPress={() => confirmDelete(item.id, item.name)}
                      style={({ pressed }) => [styles.deleteButton, pressed && styles.deleteButtonPressed]}
                    >
                      <X color={colors.status.negative} size={20} strokeWidth={2.4} />
                    </Pressable>
                  </View>
                ))}
              </View>
            </View>
          ))
        )}
      </ScrollView>

      <Pressable
        accessibilityLabel={t('transactionsAdd')}
        accessibilityRole="button"
        onPress={onAddTransaction}
        style={({ pressed }) => [styles.fab, pressed && styles.fabPressed]}
      >
        <Plus color={colors.content.inverse} size={28} strokeWidth={2.6} />
      </Pressable>

      {undoMessage ? <UndoBanner message={undoMessage} onExpire={dismissUndo} onUndo={undoDelete} undoLabel={t('undoAction')} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  backButton: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 40,
    width: 40,
  },
  container: {
    gap: spacing[4],
    padding: spacing[4],
    paddingBottom: spacing[7] + 56,
  },
  deleteButton: {
    alignItems: 'center',
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  deleteButtonPressed: {
    opacity: 0.6,
  },
  emptyText: {
    color: colors.content.muted,
    fontSize: typography.sizes.body,
    textAlign: 'center',
  },
  fab: {
    ...shadows.elevated,
    alignItems: 'center',
    backgroundColor: colors.brand.primary,
    borderRadius: radius.circle,
    bottom: spacing[5],
    height: 56,
    justifyContent: 'center',
    left: '50%',
    marginLeft: -28,
    position: 'absolute',
    width: 56,
  },
  fabPressed: {
    backgroundColor: colors.brand.primaryPressed,
  },
  group: {
    gap: spacing[2],
  },
  groupCard: {
    ...shadows.card,
    backgroundColor: colors.surface.primary,
    borderRadius: radius.lg,
    paddingHorizontal: spacing[4],
  },
  groupLabel: {
    color: colors.content.muted,
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.semibold,
  },
  header: {
    alignItems: 'center',
    backgroundColor: colors.surface.primary,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[3],
  },
  root: {
    backgroundColor: colors.surface.canvas,
    flex: 1,
  },
  rowPressable: {
    flex: 1,
  },
  rowWrapper: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  title: {
    color: colors.content.primary,
    fontSize: typography.sizes.bodyLg,
    fontWeight: typography.weights.bold,
  },
});
