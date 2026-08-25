import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { AccountPicker, AmountInput, CategoryPicker, DateField, SegmentedControl } from '@/components/finance';
import type { TransactionType } from '@/core/domain/finance/transaction';
import type { TransactionFormViewModel } from '@/features/finance/view-models/use-transaction-form';
import type { Translate, TranslationKey } from '@/i18n/translations';
import { colors, radius, spacing, typography } from '@/theme';

type TransactionFormScreenProps = TransactionFormViewModel & {
  t: Translate;
  onCancel(): void;
};

const TYPE_OPTIONS: TransactionType[] = ['expense', 'income', 'transfer'];

const TYPE_LABEL_KEYS: Record<TransactionType, TranslationKey> = {
  expense: 'transactionTypeExpense',
  income: 'transactionTypeIncome',
  transfer: 'transactionTypeTransfer',
};

/**
 * Renders the primitive Task 6 fields directly (`AmountInput`,
 * `AccountPicker`, `CategoryPicker`, `DateField`, `SegmentedControl`)
 * instead of `TransactionForm`: `TransactionForm` only accepts an
 * `initialDate` prop and always starts every other field blank, so it
 * cannot be pre-filled for editing an existing transaction (see the Task 8
 * report). Every field here is driven by `useTransactionForm`'s controlled
 * state instead, which supports both create and edit.
 */
export function TransactionFormScreen(props: TransactionFormScreenProps) {
  const {
    loading,
    submitting,
    isEditing,
    values,
    errors,
    accounts,
    categories,
    setType,
    setAmount,
    setName,
    setAccountId,
    setDestinationAccountId,
    setCategoryId,
    setDate,
    setNote,
    submit,
    onCancel,
    t,
  } = props;

  const isTransfer = values.type === 'transfer';
  const typeLabels = TYPE_OPTIONS.map((option) => t(TYPE_LABEL_KEYS[option]));
  const typeLabelToType = new Map(TYPE_OPTIONS.map((option) => [t(TYPE_LABEL_KEYS[option]), option]));

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.title}>{t('dashboardLoading')}</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>{isEditing ? t('transactionFormEditTitle') : t('transactionFormNewTitle')}</Text>

      <SegmentedControl<string>
        onChange={(label) => setType(typeLabelToType.get(label) as TransactionType)}
        options={typeLabels}
        value={t(TYPE_LABEL_KEYS[values.type])}
      />

      <View style={styles.field}>
        <Text style={styles.label}>{t('transactionFormNameLabel')}</Text>
        <TextInput
          accessibilityLabel={t('transactionFormNameLabel')}
          onChangeText={setName}
          placeholder={t('transactionFormNamePlaceholder')}
          placeholderTextColor={colors.content.placeholder}
          style={[styles.input, errors.name && styles.inputError]}
          value={values.name}
        />
        {errors.name ? (
          <Text accessibilityRole="alert" style={styles.error}>
            {errors.name}
          </Text>
        ) : null}
      </View>

      <AmountInput
        errorMessage={values.amount === null ? (errors.amount ?? null) : null}
        invalidMessage={t('amountInvalid')}
        label={t('transactionFormAmountLabel')}
        onChange={setAmount}
        placeholder={t('amountPlaceholder')}
        value={values.amount}
      />

      <AccountPicker
        accounts={accounts}
        errorMessage={errors.accountId ?? null}
        label={t('transactionFormAccountLabel')}
        onSelect={setAccountId}
        selectedId={values.accountId}
      />

      {isTransfer ? (
        <AccountPicker
          accounts={accounts}
          errorMessage={errors.destinationAccountId ?? null}
          label={t('transactionFormDestinationLabel')}
          onSelect={setDestinationAccountId}
          selectedId={values.destinationAccountId}
        />
      ) : (
        <CategoryPicker
          categories={categories}
          errorMessage={errors.categoryId ?? null}
          label={t('transactionFormCategoryLabel')}
          onSelect={setCategoryId}
          selectedId={values.categoryId}
          type={values.type === 'income' ? 'income' : 'expense'}
        />
      )}

      <DateField label={t('dateTransactionLabel')} onChange={setDate} value={values.date} />

      <View style={styles.field}>
        <Text style={styles.label}>{t('transactionFormNoteLabel')}</Text>
        <TextInput
          accessibilityLabel={t('transactionFormNoteLabel')}
          multiline
          onChangeText={setNote}
          style={[styles.input, styles.noteInput]}
          value={values.note}
        />
      </View>

      {errors.form ? (
        <Text accessibilityRole="alert" style={styles.error}>
          {errors.form}
        </Text>
      ) : null}

      <View style={styles.actions}>
        <Pressable
          accessibilityLabel={t('transactionFormCancel')}
          accessibilityRole="button"
          onPress={onCancel}
          style={({ pressed }) => [styles.secondaryAction, pressed && styles.secondaryActionPressed]}
        >
          <Text style={styles.secondaryActionText}>{t('transactionFormCancel')}</Text>
        </Pressable>
        <Pressable
          accessibilityLabel={t('transactionFormSave')}
          accessibilityRole="button"
          accessibilityState={{ disabled: submitting }}
          disabled={submitting}
          onPress={submit}
          style={({ pressed }) => [styles.primaryAction, pressed && styles.primaryActionPressed]}
        >
          <Text style={styles.primaryActionText}>{t('transactionFormSave')}</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  actions: {
    flexDirection: 'row',
    gap: spacing[2],
    marginTop: spacing[2],
  },
  container: {
    backgroundColor: colors.surface.canvas,
    flexGrow: 1,
    gap: spacing[4],
    padding: spacing[4],
  },
  error: {
    color: colors.status.negative,
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.semibold,
  },
  field: {
    gap: spacing[1],
  },
  input: {
    backgroundColor: colors.surface.input,
    borderColor: colors.border.strong,
    borderRadius: radius.sm,
    borderWidth: 1,
    color: colors.content.primary,
    fontSize: typography.sizes.bodyLg,
    fontWeight: typography.weights.semibold,
    minHeight: 48,
    paddingHorizontal: spacing[3],
  },
  inputError: {
    borderColor: colors.status.negative,
  },
  label: {
    color: colors.content.secondary,
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.semibold,
  },
  loadingContainer: {
    alignItems: 'center',
    backgroundColor: colors.surface.canvas,
    flex: 1,
    justifyContent: 'center',
  },
  noteInput: {
    minHeight: 72,
    paddingTop: spacing[3],
    textAlignVertical: 'top',
  },
  primaryAction: {
    alignItems: 'center',
    backgroundColor: colors.content.primary,
    borderRadius: radius.sm,
    flexGrow: 1,
    justifyContent: 'center',
    minHeight: 52,
  },
  primaryActionPressed: {
    backgroundColor: '#243247',
  },
  primaryActionText: {
    color: colors.content.inverse,
    fontSize: typography.sizes.bodyLg,
    fontWeight: typography.weights.bold,
  },
  secondaryAction: {
    alignItems: 'center',
    backgroundColor: colors.surface.primary,
    borderColor: colors.brand.primary,
    borderRadius: radius.sm,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 52,
    paddingHorizontal: spacing[4],
  },
  secondaryActionPressed: {
    backgroundColor: colors.brand.soft,
  },
  secondaryActionText: {
    color: colors.brand.primaryPressed,
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.semibold,
  },
  title: {
    color: colors.content.primary,
    fontSize: typography.sizes.title,
    fontWeight: typography.weights.bold,
  },
});
