import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import type { Account } from '@/core/domain/finance/account';
import type { Category } from '@/core/domain/finance/category';
import { validateTransactionInput, type TransactionInput, type TransactionType } from '@/core/domain/finance/transaction';
import type { Translate } from '@/i18n/translations';
import { colors, radius, shadows, spacing, typography } from '@/theme';

import { AccountPicker } from './AccountPicker';
import { AmountInput } from './AmountInput';
import { CategoryPicker } from './CategoryPicker';
import { DateField } from './DateField';
import { SegmentedControl } from './SegmentedControl';

type FormErrors = {
  name?: string;
  amount?: string;
  accountId?: string;
  categoryId?: string;
  destinationAccountId?: string;
  /** Catch-all for domain-validation failures not already covered by a field-specific check above (e.g. an invalid date). */
  form?: string;
};

type TransactionFormProps = {
  accounts: readonly Account[];
  categories: readonly Category[];
  initialDate?: string;
  onSubmit: (input: TransactionInput) => void;
  t: Translate;
};

function todayIso(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function TransactionForm({ accounts, categories, initialDate, onSubmit, t }: TransactionFormProps) {
  const [type, setType] = useState<TransactionType>('expense');
  const [amount, setAmount] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [accountId, setAccountId] = useState<string | null>(null);
  const [destinationAccountId, setDestinationAccountId] = useState<string | null>(null);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [date, setDate] = useState(initialDate ?? todayIso());
  const [note, setNote] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});

  const isTransfer = type === 'transfer';
  const typeLabels: Record<TransactionType, string> = {
    income: t('transactionTypeIncome'),
    expense: t('transactionTypeExpense'),
    transfer: t('transactionTypeTransfer'),
  };

  function handleSubmit() {
    const nextErrors: FormErrors = {};

    if (name.trim() === '') {
      nextErrors.name = t('transactionFormNameRequired');
    }
    if (amount === null || amount <= 0) {
      nextErrors.amount = t('transactionFormAmountRequired');
    }
    if (accountId === null) {
      nextErrors.accountId = t('transactionFormAccountRequired');
    }
    if (isTransfer) {
      if (destinationAccountId === null) {
        nextErrors.destinationAccountId = t('transactionFormDestinationRequired');
      } else if (destinationAccountId === accountId) {
        nextErrors.destinationAccountId = t('transactionFormDestinationSame');
      }
    } else if (categoryId === null) {
      nextErrors.categoryId = t('transactionFormCategoryRequired');
    }

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    const input: TransactionInput = isTransfer
      ? {
          type: 'transfer',
          amount: amount as number,
          accountId: accountId as string,
          destinationAccountId: destinationAccountId as string,
          date,
          name: name.trim(),
          note: note.trim() === '' ? null : note.trim(),
        }
      : {
          type,
          amount: amount as number,
          accountId: accountId as string,
          categoryId: categoryId as string,
          date,
          name: name.trim(),
          note: note.trim() === '' ? null : note.trim(),
        };

    try {
      validateTransactionInput(input);
    } catch (error) {
      setErrors({ form: error instanceof Error ? error.message : t('transactionFormGenericError') });
      return;
    }

    onSubmit(input);
  }

  return (
    <View style={styles.container}>
      <SegmentedControl
        onChange={(option: string) => setType((Object.keys(typeLabels) as TransactionType[]).find((key) => typeLabels[key] === option) ?? 'expense')}
        options={Object.values(typeLabels)}
        value={typeLabels[type]}
      />

      <NameField errorMessage={errors.name} label={t('transactionFormNameLabel')} onChange={setName} placeholder={t('transactionFormNamePlaceholder')} value={name} />

      <AmountInput errorMessage={amount === null ? (errors.amount ?? null) : null} invalidMessage={t('amountInvalid')} label={t('transactionFormAmountLabel')} onChange={setAmount} placeholder={t('amountPlaceholder')} value={amount} />

      <AccountPicker
        accounts={accounts}
        errorMessage={errors.accountId ?? null}
        label={t('transactionFormAccountLabel')}
        onSelect={setAccountId}
        selectedId={accountId}
      />

      {isTransfer ? (
        <AccountPicker
          accounts={accounts}
          errorMessage={errors.destinationAccountId ?? null}
          label={t('transactionFormDestinationLabel')}
          onSelect={setDestinationAccountId}
          selectedId={destinationAccountId}
        />
      ) : (
        <CategoryPicker
          categories={categories}
          errorMessage={errors.categoryId ?? null}
          label={t('transactionFormCategoryLabel')}
          onSelect={setCategoryId}
          selectedId={categoryId}
          type={type === 'income' ? 'income' : 'expense'}
        />
      )}

      <DateField label={t('dateTransactionLabel')} onChange={setDate} value={date} />

      <NoteField label={t('transactionFormNoteLabel')} onChange={setNote} placeholder={t('transactionFormNoteLabel')} value={note} />

      {errors.form ? (
        <Text accessibilityRole="alert" style={styles.error}>
          {errors.form}
        </Text>
      ) : null}

      <Pressable
        accessibilityLabel={t('transactionFormSave')}
        accessibilityRole="button"
        onPress={handleSubmit}
        style={({ pressed }) => [styles.saveButton, pressed && styles.saveButtonPressed]}
      >
        <Text style={styles.saveButtonText}>{t('transactionFormSave')}</Text>
      </Pressable>
    </View>
  );
}

function NameField({ value, onChange, errorMessage, label, placeholder }: { value: string; onChange: (value: string) => void; errorMessage?: string; label: string; placeholder: string }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={colors.content.placeholder}
        style={[styles.input, errorMessage && styles.inputError]}
        value={value}
      />
      {errorMessage ? (
        <Text accessibilityRole="alert" style={styles.error}>
          {errorMessage}
        </Text>
      ) : null}
    </View>
  );
}

function NoteField({ value, onChange, label, placeholder }: { value: string; onChange: (value: string) => void; label: string; placeholder: string }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        multiline
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={colors.content.placeholder}
        style={[styles.input, styles.noteInput]}
        value={value}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...shadows.card,
    backgroundColor: colors.surface.primary,
    borderRadius: radius.lg,
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
  noteInput: {
    minHeight: 72,
    paddingTop: spacing[3],
    textAlignVertical: 'top',
  },
  saveButton: {
    alignItems: 'center',
    backgroundColor: colors.content.primary,
    borderRadius: radius.sm,
    justifyContent: 'center',
    minHeight: 52,
  },
  saveButtonPressed: {
    backgroundColor: '#243247',
  },
  saveButtonText: {
    color: colors.content.inverse,
    fontSize: typography.sizes.bodyLg,
    fontWeight: typography.weights.bold,
  },
});
