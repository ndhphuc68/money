import { StyleSheet, Text, View } from 'react-native';

import { colors, spacing, typography } from '@/theme';

import { CategoryIcon, type CategoryIconName } from './icons';

type TransactionRowProps = {
  name: string;
  category: string;
  meta: string;
  amount: string;
  positive: boolean;
  icon: CategoryIconName;
  showDivider?: boolean;
};

export function TransactionRow({ name, category, meta, amount, positive, icon, showDivider = true }: TransactionRowProps) {
  return (
    <View style={[styles.row, showDivider && styles.divider]}>
      <CategoryIcon name={icon} />
      <View style={styles.copy}>
        <Text numberOfLines={1} style={styles.name}>{name}</Text>
        <Text numberOfLines={1} style={styles.meta}>{category} · {meta}</Text>
      </View>
      <Text numberOfLines={1} style={[styles.amount, { color: positive ? colors.status.positive : colors.status.negative }]}>
        {amount}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  amount: {
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.black,
    marginLeft: spacing[3],
    maxWidth: 112,
  },
  copy: {
    flex: 1,
    minWidth: 0,
  },
  divider: {
    borderBottomColor: colors.divider,
    borderBottomWidth: 1,
  },
  meta: {
    color: colors.content.muted,
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.semibold,
    marginTop: 2,
  },
  name: {
    color: colors.content.primary,
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.bold,
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing[3],
    minHeight: 64,
    paddingVertical: spacing[3],
  },
});
