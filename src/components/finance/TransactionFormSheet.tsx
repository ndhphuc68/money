import { useState } from 'react';
import { ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';

import { Card, Dropdown, PrimaryButton, Sheet } from '@/components/base';
import type { RecurringFrequency } from '@/core/domain/finance/recurring-date';
import type { TransactionType } from '@/core/domain/finance/transaction';
import type {
  RecurringEndMode,
  TransactionFormViewModel,
} from '@/features/finance/view-models/use-transaction-form';
import type { Translate } from '@/i18n/translations';
import { colors, radius, spacing, typography } from '@/theme';

import { AmountInput } from './AmountInput';
import { SegmentedControl } from './SegmentedControl';

export type TransactionFormSheetProps = TransactionFormViewModel & {
  visible: boolean;
  t: Translate;
  onClose(): void;
};

const TYPE_OPTIONS: TransactionType[] = ['expense', 'income'];

const FREQUENCY_LABELS: Record<RecurringFrequency, string> = {
  weekly: 'Hàng tuần',
  monthly: 'Hàng tháng',
  quarterly: 'Hàng quý',
  yearly: 'Hàng năm',
};
const END_MODE_LABELS: Record<RecurringEndMode, string> = {
  none: 'Không giới hạn',
  date: 'Đến ngày',
  count: 'Số kỳ',
};

export function TransactionFormSheet({ visible, t, onClose, ...props }: TransactionFormSheetProps) {
  const {
    loading,
    submitting,
    isEditing,
    canEnableRecurring,
    values,
    errors,
    categories,
    setType,
    setAmount,
    setCategoryId,
    setNote,
    setRecurringEnabled,
    setRecurringFrequency,
    setRecurringRemindDaysBefore,
    setRecurringEndMode,
    setRecurringOccurrenceLimit,
    submit,
  } = props;

  const [openDropdown, setOpenDropdown] = useState<'category' | 'frequency' | 'endMode' | null>(
    null,
  );

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
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          nestedScrollEnabled
          onScrollBeginDrag={() => setOpenDropdown(null)}
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

          <View style={[styles.field, openDropdown === 'category' && styles.fieldOpen]}>
            <Dropdown
              errorMessage={errors.categoryId ?? null}
              fieldLabel={t('transactionFormCategoryLabel')}
              onSelect={(key) => {
                setCategoryId(key);
                setOpenDropdown(null);
              }}
              onToggle={() => setOpenDropdown(openDropdown === 'category' ? null : 'category')}
              open={openDropdown === 'category'}
              options={categories
                .filter((category) => category.type === selectedType && !category.isArchived)
                .map((category) => ({
                  isActive: category.id === values.categoryId,
                  key: category.id,
                  label: category.name,
                }))}
              placeholder={!values.categoryId}
              valueLabel={
                categories.find((category) => category.id === values.categoryId)?.name ??
                t('transactionFormCategoryPlaceholder')
              }
            />
          </View>

          {selectedType === 'expense' && canEnableRecurring ? (
            <View
              style={[
                styles.recurringCard,
                (openDropdown === 'frequency' || openDropdown === 'endMode') &&
                  styles.recurringCardOpen,
              ]}
              testID="recurring-toggle-card">
              <Card>
                <View style={styles.recurringToggleRow}>
                  <View style={styles.recurringToggleCopy}>
                    <Text style={styles.sectionLabel}>{t('recurringToggleLabel')}</Text>
                    <Text style={styles.recurringToggleHint}>
                      {values.recurringEnabled
                        ? t('recurringToggleHintOn')
                        : t('recurringToggleHintOff')}
                    </Text>
                  </View>
                  <Switch
                    accessibilityLabel={t('recurringToggleLabel')}
                    onValueChange={setRecurringEnabled}
                    thumbColor={colors.content.inverse}
                    trackColor={{ false: colors.surface.muted, true: colors.brand.primary }}
                    value={values.recurringEnabled}
                  />
                </View>

                {values.recurringEnabled ? (
                  <View style={styles.recurringFields}>
                    <Dropdown
                      fieldLabel={t('recurringFrequencyLabel')}
                      onSelect={(key) => {
                        setRecurringFrequency(key as RecurringFrequency);
                        setOpenDropdown(null);
                      }}
                      onToggle={() =>
                        setOpenDropdown(openDropdown === 'frequency' ? null : 'frequency')
                      }
                      open={openDropdown === 'frequency'}
                      options={(Object.keys(FREQUENCY_LABELS) as RecurringFrequency[]).map(
                        (key) => ({
                          key,
                          label: FREQUENCY_LABELS[key],
                          isActive: key === values.recurringFrequency,
                        }),
                      )}
                      valueLabel={FREQUENCY_LABELS[values.recurringFrequency]}
                    />

                    <View style={styles.field}>
                      <Text style={styles.sectionLabel}>{t('recurringRemindDaysBeforeLabel')}</Text>
                      <TextInput
                        accessibilityLabel={t('recurringRemindDaysBeforeLabel')}
                        inputMode="numeric"
                        keyboardType="number-pad"
                        onChangeText={(text) =>
                          setRecurringRemindDaysBefore(Math.max(0, parseInt(text, 10) || 0))
                        }
                        style={styles.recurringNumberInput}
                        value={String(values.recurringRemindDaysBefore)}
                      />
                    </View>

                    <Dropdown
                      fieldLabel={t('recurringEndLabel')}
                      onSelect={(key) => {
                        setRecurringEndMode(key as RecurringEndMode);
                        setOpenDropdown(null);
                      }}
                      onToggle={() =>
                        setOpenDropdown(openDropdown === 'endMode' ? null : 'endMode')
                      }
                      open={openDropdown === 'endMode'}
                      options={(Object.keys(END_MODE_LABELS) as RecurringEndMode[]).map((key) => ({
                        key,
                        label: END_MODE_LABELS[key],
                        isActive: key === values.recurringEndMode,
                      }))}
                      valueLabel={END_MODE_LABELS[values.recurringEndMode]}
                    />

                    {values.recurringEndMode === 'count' ? (
                      <View style={styles.field}>
                        <Text style={styles.sectionLabel}>
                          {t('recurringOccurrenceLimitLabel')}
                        </Text>
                        <TextInput
                          accessibilityLabel={t('recurringOccurrenceLimitLabel')}
                          inputMode="numeric"
                          keyboardType="number-pad"
                          onChangeText={(text) =>
                            setRecurringOccurrenceLimit(parseInt(text, 10) || null)
                          }
                          style={styles.recurringNumberInput}
                          value={
                            values.recurringOccurrenceLimit
                              ? String(values.recurringOccurrenceLimit)
                              : ''
                          }
                        />
                      </View>
                    ) : null}

                    <Text style={styles.recurringNote}>{t('recurringFirstPeriodNote')}</Text>
                  </View>
                ) : null}
              </Card>
            </View>
          ) : null}

          <View style={styles.field}>
            <Text style={styles.label}>{noteLabel}</Text>
            <TextInput
              accessibilityLabel={noteLabel}
              multiline
              onChangeText={setNote}
              placeholder="Ví dụ: Ăn trưa với đồng nghiệp"
              placeholderTextColor={colors.content.placeholder}
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
  fieldOpen: {
    elevation: 30,
    zIndex: 30,
  },
  label: {
    color: colors.content.secondary,
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.black,
    marginBottom: spacing[1],
  },
  loadingText: {
    color: colors.content.primary,
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.semibold,
    paddingVertical: spacing[5],
    textAlign: 'center',
  },
  noteInput: {
    backgroundColor: colors.surface.input,
    borderColor: colors.border.strong,
    borderRadius: radius.sm,
    borderWidth: 1,
    color: colors.content.primary,
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.semibold,
    minHeight: 80,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[3],
  },
  recurringCard: {
    marginBottom: spacing[4],
  },
  recurringCardOpen: {
    elevation: 30,
    zIndex: 30,
  },
  recurringFields: {
    borderTopColor: colors.border.subtle,
    borderTopWidth: 1,
    gap: spacing[1],
    marginTop: spacing[3],
    paddingTop: spacing[3],
  },
  recurringNote: {
    color: colors.content.secondary,
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.semibold,
    lineHeight: 17,
    marginTop: spacing[2],
  },
  recurringNumberInput: {
    backgroundColor: colors.surface.input,
    borderColor: colors.border.strong,
    borderRadius: radius.sm,
    borderWidth: 1,
    color: colors.content.primary,
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.semibold,
    height: 48,
    paddingHorizontal: spacing[3],
  },
  recurringToggleCopy: {
    flex: 1,
  },
  recurringToggleHint: {
    color: colors.content.secondary,
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.semibold,
    marginTop: 2,
  },
  recurringToggleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  saveButtonSpacing: {
    marginTop: spacing[1],
  },
  scrollContent: {
    paddingBottom: spacing[6],
  },
  sectionLabel: {
    color: colors.content.primary,
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.bold,
    marginBottom: spacing[2],
  },
});
