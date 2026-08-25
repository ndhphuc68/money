import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import type { Account } from '@/core/domain/finance/account';
import type { Category } from '@/core/domain/finance/category';
import { validateTransactionInput, type TransactionInput, type TransactionType } from '@/core/domain/finance/transaction';
import { colors, radius, shadows, spacing, typography } from '@/theme';

import { AccountPicker } from './AccountPicker';
import { AmountInput } from './AmountInput';
import { CategoryPicker } from './CategoryPicker';
import { DateField } from './DateField';
import { SegmentedControl } from './SegmentedControl';

const TYPE_OPTIONS = ['Thu nhap', 'Chi tieu', 'Chuyen khoan'] as const;
type TypeOption = (typeof TYPE_OPTIONS)[number];

const TYPE_TO_DOMAIN: Record<TypeOption, TransactionType> = {
  'Thu nhap': 'income',
  'Chi tieu': 'expense',
  'Chuyen khoan': 'transfer',
};

const DOMAIN_TO_TYPE: Record<TransactionType, TypeOption> = {
  income: 'Thu nhap',
  expense: 'Chi tieu',
  transfer: 'Chuyen khoan',
};

type FormErrors = {
  name?: string;
  amount?: string;
  accountId?: string;
  categoryId?: string;
  destinationAccountId?: string;
};

type TransactionFormProps = {
  accounts: readonly Account[];
  categories: readonly Category[];
  initialDate?: string;
  onSubmit: (input: TransactionInput) => void;
};

function todayIso(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function TransactionForm({ accounts, categories, initialDate, onSubmit }: TransactionFormProps) {
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

  function handleSubmit() {
    const nextErrors: FormErrors = {};

    if (name.trim() === '') {
      nextErrors.name = 'Vui long nhap ten giao dich';
    }
    if (amount === null || amount <= 0) {
      nextErrors.amount = 'So tien khong hop le';
    }
    if (accountId === null) {
      nextErrors.accountId = 'Vui long chon tai khoan';
    }
    if (isTransfer) {
      if (destinationAccountId === null) {
        nextErrors.destinationAccountId = 'Vui long chon tai khoan dich';
      } else if (destinationAccountId === accountId) {
        nextErrors.destinationAccountId = 'Tai khoan dich phai khac tai khoan nguon';
      }
    } else if (categoryId === null) {
      nextErrors.categoryId = 'Vui long chon danh muc';
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
      setErrors({ name: error instanceof Error ? error.message : 'Giao dich khong hop le' });
      return;
    }

    onSubmit(input);
  }

  return (
    <View style={styles.container}>
      <SegmentedControl
        onChange={(option: TypeOption) => setType(TYPE_TO_DOMAIN[option])}
        options={TYPE_OPTIONS}
        value={DOMAIN_TO_TYPE[type]}
      />

      <NameField errorMessage={errors.name} onChange={setName} value={name} />

      <AmountInput onChange={setAmount} value={amount} />
      {errors.amount ? (
        <Text accessibilityRole="alert" style={styles.error}>
          {errors.amount}
        </Text>
      ) : null}

      <AccountPicker
        accounts={accounts}
        errorMessage={errors.accountId ?? null}
        label="Tai khoan"
        onSelect={setAccountId}
        selectedId={accountId}
      />

      {isTransfer ? (
        <AccountPicker
          accounts={accounts}
          errorMessage={errors.destinationAccountId ?? null}
          label="Tai khoan dich"
          onSelect={setDestinationAccountId}
          selectedId={destinationAccountId}
        />
      ) : (
        <CategoryPicker
          categories={categories}
          errorMessage={errors.categoryId ?? null}
          label="Danh muc"
          onSelect={setCategoryId}
          selectedId={categoryId}
          type={type === 'income' ? 'income' : 'expense'}
        />
      )}

      <DateField onChange={setDate} value={date} />

      <NoteField onChange={setNote} value={note} />

      <Pressable
        accessibilityLabel="Luu giao dich"
        accessibilityRole="button"
        onPress={handleSubmit}
        style={({ pressed }) => [styles.saveButton, pressed && styles.saveButtonPressed]}
      >
        <Text style={styles.saveButtonText}>Luu giao dich</Text>
      </Pressable>
    </View>
  );
}

function NameField({ value, onChange, errorMessage }: { value: string; onChange: (value: string) => void; errorMessage?: string }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>Ten giao dich</Text>
      <TextInput
        accessibilityLabel="Ten giao dich"
        onChangeText={onChange}
        placeholder="VD: An trua"
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

function NoteField({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>Ghi chu (khong bat buoc)</Text>
      <TextInput
        accessibilityLabel="Ghi chu"
        multiline
        onChangeText={onChange}
        placeholder="Them ghi chu"
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
