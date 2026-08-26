import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AmountInput, BottomNav, CategoryPicker, SegmentedControl } from '@/components/finance';
import type { TransactionType } from '@/core/domain/finance/transaction';
import type { TransactionFormViewModel } from '@/features/finance/view-models/use-transaction-form';
import type { Translate } from '@/i18n/translations';
import { colors, radius, shadows, spacing, typography } from '@/theme';

type TransactionFormScreenProps = TransactionFormViewModel & {
  t: Translate;
  onCancel(): void;
  onNavigate?(key: string): void;
};

const TYPE_OPTIONS: TransactionType[] = ['expense', 'income'];

export function TransactionFormScreen({ onNavigate, t, ...props }: TransactionFormScreenProps) {
  const { loading, submitting, isEditing, values, errors, categories, setType, setAmount, setCategoryId, setNote, submit } = props;

  if (loading) {
    return <View style={styles.loadingContainer}><Text style={styles.loadingText}>{t('dashboardLoading')}</Text></View>;
  }

  const typeLabels: Record<TransactionType, string> = {
    expense: t('transactionTypeExpense'),
    income: t('transactionTypeIncome'),
    transfer: t('transactionTypeTransfer'),
  };
  const noteLabel = t('transactionFormNoteLabel');
  const noteTitle = noteLabel.replace(/\s*\(.*\)$/, '');
  const selectedType = values.type === 'income' ? 'income' : 'expense';

  return (
    <View style={styles.screen}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
        style={styles.keyboardAvoiding}
      >
        <SafeAreaView edges={['top']} style={styles.safeContent}>
          <ScrollView
            automaticallyAdjustKeyboardInsets
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            testID="transaction-form-scroll"
          >
          <View style={styles.header}>
            <Text style={styles.title}>{isEditing ? t('transactionFormEditTitle') : t('dashboardAddTransaction')}</Text>
          </View>

          <SegmentedControl
            onChange={(label) => setType(label === typeLabels.income ? 'income' : 'expense')}
            options={TYPE_OPTIONS.map((type) => typeLabels[type])}
            value={typeLabels[selectedType]}
          />

          <AmountInput
            errorMessage={values.amount === null ? (errors.amount ?? null) : null}
            invalidMessage={t('amountInvalid')}
            label={t('transactionFormAmountLabel')}
            onChange={setAmount}
            placeholder={t('amountPlaceholder')}
            value={values.amount}
          />

          <View style={styles.section}>
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
            <Text style={styles.sectionLabel}>{noteTitle}</Text>
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

          {errors.form ? <Text accessibilityRole="alert" style={styles.error}>{errors.form}</Text> : null}

          <Pressable
            accessibilityLabel={t('transactionFormSave')}
            accessibilityRole="button"
            accessibilityState={{ disabled: submitting }}
            disabled={submitting}
            onPress={submit}
            style={({ pressed }) => [styles.saveButton, pressed && styles.saveButtonPressed]}
          >
            <Text style={styles.saveButtonText}>{t('transactionFormSave')}</Text>
          </Pressable>
          </ScrollView>
        </SafeAreaView>
      </KeyboardAvoidingView>

      <BottomNav
        activeKey=""
        addAccessibilityLabel={t('dashboardAddTransaction')}
        items={[
          { key: 'overview', label: t('navOverview'), icon: 'overview' },
          { key: 'transactions', label: t('navTransactions'), icon: 'list' },
          { key: 'reports', label: t('navReports'), icon: 'target' },
          { key: 'settings', label: t('navSettings'), icon: 'profile' },
        ]}
        onAdd={onNavigate ? () => onNavigate('form') : undefined}
        onChange={onNavigate}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing[4], paddingBottom: spacing[5], paddingHorizontal: spacing[4], paddingTop: spacing[2] },
  error: { color: colors.status.negative, fontSize: typography.sizes.caption, fontWeight: typography.weights.semibold },
  header: { justifyContent: 'center', minHeight: 44 },
  keyboardAvoiding: { flex: 1 },
  loadingContainer: { alignItems: 'center', backgroundColor: colors.surface.canvas, flex: 1, justifyContent: 'center' },
  loadingText: { color: colors.content.primary, fontSize: typography.sizes.body, fontWeight: typography.weights.semibold },
  noteCard: { ...shadows.card, backgroundColor: colors.surface.primary, borderRadius: radius.lg, gap: spacing[1], minHeight: 64, paddingHorizontal: spacing[4], paddingTop: spacing[3] },
  noteInput: { color: colors.content.primary, fontSize: typography.sizes.body, minHeight: 30, padding: 0 },
  safeContent: { flex: 1 },
  saveButton: { alignItems: 'center', backgroundColor: colors.content.primary, borderRadius: radius.sm, justifyContent: 'center', minHeight: 52 },
  saveButtonPressed: { backgroundColor: colors.brand.primaryPressed },
  saveButtonText: { color: colors.content.inverse, fontSize: typography.sizes.body, fontWeight: typography.weights.bold },
  screen: { backgroundColor: colors.surface.canvas, flex: 1 },
  section: { gap: spacing[2] },
  sectionLabel: { color: colors.content.primary, fontSize: typography.sizes.small, fontWeight: typography.weights.bold },
  title: { color: colors.content.primary, fontSize: typography.sizes.heading, fontWeight: typography.weights.bold },
});
