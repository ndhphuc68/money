import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { formatVnd, parseVndInput } from '@/core/domain/finance/money';
import { colors, radius, spacing, typography } from '@/theme';

type AmountInputProps = {
  value: number | null;
  onChange: (amount: number | null) => void;
  label?: string;
  placeholder?: string;
};

const INVALID_AMOUNT_MESSAGE = 'So tien khong hop le';

export function AmountInput({ value, onChange, label = 'So tien', placeholder = 'Nhap so tien' }: AmountInputProps) {
  const [text, setText] = useState(value != null ? formatVnd(value) : '');
  const [error, setError] = useState<string | null>(null);

  function handleChangeText(nextText: string) {
    setText(nextText);

    if (nextText.trim() === '') {
      setError(null);
      onChange(null);
      return;
    }

    const parsed = parseVndInput(nextText);
    if (parsed === null || parsed <= 0) {
      setError(INVALID_AMOUNT_MESSAGE);
      onChange(null);
      return;
    }

    setError(null);
    onChange(parsed);
  }

  function handleBlur() {
    if (value != null) {
      setText(formatVnd(value));
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        keyboardType="numeric"
        onBlur={handleBlur}
        onChangeText={handleChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.content.placeholder}
        style={[styles.input, error && styles.inputError]}
        value={text}
      />
      {error ? (
        <Text accessibilityRole="alert" style={styles.error}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing[1],
  },
  error: {
    color: colors.status.negative,
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.semibold,
  },
  input: {
    backgroundColor: colors.surface.input,
    borderColor: colors.border.strong,
    borderRadius: radius.sm,
    borderWidth: 1,
    color: colors.content.primary,
    fontSize: typography.sizes.bodyLg,
    fontWeight: typography.weights.bold,
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
});
