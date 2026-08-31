import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { PrimaryButton, Sheet } from '@/components/base';
import type { TransactionType } from '@/core/domain/finance/transaction';
import type { TransactionFormViewModel } from '@/features/finance/view-models/use-transaction-form';
import type { Translate } from '@/i18n/translations';
import { colors, radius, shadows, spacing, typography } from '@/theme';

import { AmountInput } from './AmountInput';
import { CategoryPicker } from './CategoryPicker';
import { SegmentedControl } from './SegmentedControl';

export type TransactionFormSheetProps = TransactionFormViewModel & {
  visible: boolean;
  t: Translate;
  onClose(): void;
};

const TYPE_OPTIONS: TransactionType[] = ['expense', 'income'];

export function TransactionFormSheet({ visible, t, onClose, ...props }: TransactionFormSheetProps) {
  const {
    loading,
    submitting,
    isEditing,
    values,
    errors,
    categories,
    setType,
    setAmount,
    setCategoryId,
    setNote,
    submit,
  } = props;

  const typeLabels: Record<TransactionType, string> = {
    expense: t('transactionTypeExpense'),
    income: t('transactionTypeIncome'),
    transfer: t('transactionTypeTransfer'),
  };
  const noteLabel = t('transactionFormNoteLabel');
  const selectedType = values.type === 'income' ? 'income' : 'expense';

  return (
    <Sheet
      closeLabel={t('transactionFormCancel')}
      onClose={onClose}
      title={isEditing ? t('transactionFormEditTitle') : t('transactionFormNewTitle')}
      visible={visible}>
      {loading ? (
        <Text style={styles.loadingText}>{t('dashboardLoading')}</Text>
      ) : (
        <ScrollView
          automaticallyAdjustKeyboardInsets
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          testID="transaction-form-scroll">
          <View style={styles.field}>
            <SegmentedControl
              onChange={(label) => setType(label === typeLabels.income ? 'income' : 'expense')}
              options={TYPE_OPTIONS.map((type) => typeLabels[type])}
              value={typeLabels[selectedType]}
            />
          </View>

          <View style={styles.field}>
            <AmountInput
              errorMessage={values.amount === null ? (errors.amount ?? null) : null}
              invalidMessage={t('amountInvalid')}
              label={t('transactionFormAmountLabel')}
              onChange={setAmount}
              placeholder={t('amountPlaceholder')}
              value={values.amount}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.sectionLabel}>{t('transactionFormCategoryLabel')}</Text>
            <CategoryPicker
              categories={categories}
              errorMessage={errors.categoryId ?? null}
              onSelect={setCategoryId}
              selectedId={values.categoryId}
              type={selectedType}
            />
          </View>

          <View style={styles.noteCard}>
            <Text style={styles.sectionLabel}>{noteLabel}</Text>
            <TextInput
              accessibilityLabel={noteLabel}
              multiline
              onChangeText={setNote}
              placeholder="Ví dụ: Ăn trưa với đồng nghiệp"
              placeholderTextColor={colors.content.secondary}
              style={styles.noteInput}
              textAlignVertical="top"
              value={values.note}
            />
          </View>

          {errors.form ? (
            <Text accessibilityRole="alert" style={styles.error}>
              {errors.form}
            </Text>
          ) : null}

          <PrimaryButton
            disabled={submitting}
            label={t('transactionFormSave')}
            onPress={submit}
            pressedBackgroundColor={colors.brand.primaryPressed}
            radius="sm"
            style={styles.saveButtonSpacing}
          />
        </ScrollView>
      )}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  error: {
    color: colors.status.negative,
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.semibold,
  },
  field: {
    marginBottom: spacing[4],
  },
  loadingText: {
    color: colors.content.primary,
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.semibold,
    paddingVertical: spacing[5],
    textAlign: 'center',
  },
  noteCard: {
    ...shadows.card,
    backgroundColor: colors.surface.primary,
    borderRadius: radius.lg,
    gap: spacing[1],
    marginBottom: spacing[4],
    minHeight: 64,
    paddingHorizontal: spacing[4],
    paddingTop: spacing[3],
  },
  noteInput: {
    color: colors.content.primary,
    fontSize: typography.sizes.body,
    minHeight: 30,
    padding: 0,
  },
  saveButtonSpacing: {
    marginTop: spacing[1],
  },
  sectionLabel: {
    color: colors.content.primary,
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.bold,
    marginBottom: spacing[2],
  },
});
