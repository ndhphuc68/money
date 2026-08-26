import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { formatVnd, parseVndInput } from '@/core/domain/finance/money';
import { colors, radius, shadows, spacing, typography } from '@/theme';

type AmountInputProps = {
  value: number | null;
  onChange: (amount: number | null) => void;
  label: string;
  placeholder: string;
  invalidMessage: string;
  /**
   * External validation error (e.g. "amount is required") shown only while
   * the field has no parse error of its own, so the two sources never
   * render two error lines at once.
   */
  errorMessage?: string | null;
};

function formatAmountDisplay(amount: number): string {
  return formatVnd(amount).replace(/\s₫$/, '');
}

export function AmountInput({
  value,
  onChange,
  label,
  placeholder,
  invalidMessage,
  errorMessage = null,
}: AmountInputProps) {
  const [text, setText] = useState(value != null ? formatAmountDisplay(value) : '');
  const [error, setError] = useState<string | null>(null);
  const displayedError = error ?? errorMessage;

  function handleChangeText(nextText: string) {
    if (nextText.trim() === '') {
      setText('');
      setError(null);
      onChange(null);
      return;
    }

    const parsed = parseVndInput(nextText);
    if (parsed === null || parsed <= 0) {
      setError(invalidMessage);
      onChange(null);
      return;
    }

    setError(null);
    setText(formatAmountDisplay(parsed));
    onChange(parsed);
  }

  function handleBlur() {
    if (value != null) {
      setText(formatAmountDisplay(value));
    }
  }

  return (
    <View style={[styles.container, displayedError && styles.containerError]}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputRow}>
        <TextInput
          accessibilityLabel={label}
          keyboardType="numeric"
          onBlur={handleBlur}
          onChangeText={handleChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.content.placeholder}
          style={styles.input}
          value={text}
        />
        <Text style={styles.currency}>₫</Text>
      </View>
      {displayedError ? (
        <Text accessibilityRole="alert" style={styles.error}>
          {displayedError}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...shadows.card,
    backgroundColor: colors.surface.primary,
    borderRadius: radius.lg,
    gap: spacing[2],
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[4],
  },
  containerError: {
    borderColor: colors.status.negative,
    borderWidth: 1,
  },
  error: {
    color: colors.status.negative,
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.semibold,
  },
  input: {
    color: colors.content.primary,
    flex: 1,
    fontSize: typography.sizes.display,
    fontWeight: typography.weights.bold,
    minHeight: 52,
    padding: 0,
  },
  inputRow: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  currency: {
    color: colors.content.primary,
    fontSize: typography.sizes.display,
    fontWeight: typography.weights.bold,
    textDecorationLine: 'underline',
  },
  label: {
    color: colors.content.secondary,
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.semibold,
  },
});
