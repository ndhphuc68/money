import { StyleSheet, Text, View } from 'react-native';

import { PillChip } from '@/components/base';
import type { Account } from '@/core/domain/finance/account';
import { colors, spacing, typography } from '@/theme';

type AccountPickerProps = {
  accounts: readonly Account[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  label?: string;
  allowUnselect?: boolean;
  allLabel?: string;
  errorMessage?: string | null;
};

export function AccountPicker({
  accounts,
  selectedId,
  onSelect,
  label,
  allowUnselect = false,
  allLabel,
  errorMessage = null,
}: AccountPickerProps) {
  return (
    <View style={styles.container}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={styles.list}>
        {allowUnselect && allLabel ? (
          <PillChip active={selectedId === null} label={allLabel} onPress={() => onSelect(null)} />
        ) : null}
        {accounts.map((account) => (
          <PillChip
            active={account.id === selectedId}
            key={account.id}
            label={account.name}
            onPress={() => onSelect(account.id)}
          />
        ))}
      </View>
      {errorMessage ? (
        <Text accessibilityRole="alert" style={styles.error}>
          {errorMessage}
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
  label: {
    color: colors.content.secondary,
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.semibold,
  },
  list: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
  },
});
