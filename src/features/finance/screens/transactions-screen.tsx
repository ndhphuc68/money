import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { X } from 'lucide-react-native';

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
    deleteTransaction,
    undoDelete,
    dismissUndo,
    onSelectTransaction,
    t,
  } = props;

  function confirmDelete(id: string, name: string) {
    Alert.alert(
      t('transactionsDeleteConfirmTitle'),
      t('transactionsDeleteConfirmMessage', { name }),
      [
        { text: t('transactionsDeleteConfirmCancel'), style: 'cancel' },
        {
          text: t('transactionsDeleteConfirmConfirm'),
          style: 'destructive',
          onPress: () => deleteTransaction(id),
        },
      ],
    );
  }

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
                  <View key={item.id} style={styles.rowWrapper}>
                    <Pressable
                      accessibilityLabel={t('transactionsEditLabel', { name: item.name })}
                      accessibilityRole="button"
                      onPress={() => onSelectTransaction(item.id)}
                      style={styles.rowPressable}>
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
                      style={({ pressed }) => [
                        styles.deleteButton,
                        pressed && styles.deleteButtonPressed,
                      ]}>
                      <X color={colors.status.negative} size={20} strokeWidth={2.4} />
                    </Pressable>
                  </View>
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
    fontSize: 11,
    fontWeight: typography.weights.semibold,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
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
    fontSize: 22,
    fontWeight: typography.weights.black,
    lineHeight: 26,
  },
});
