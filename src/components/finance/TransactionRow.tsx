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

export function TransactionRow({
  name,
  category,
  meta,
  amount,
  positive,
  icon,
  showDivider = true,
}: TransactionRowProps) {
  return (
    <View style={[styles.row, showDivider && styles.divider]}>
      <CategoryIcon name={icon} />
      <View style={styles.copy}>
        <Text numberOfLines={1} style={styles.name}>
          {name}
        </Text>
        <Text numberOfLines={1} style={styles.meta}>
          {category} · {meta}
        </Text>
      </View>
      <Text
        numberOfLines={1}
        style={[
          styles.amount,
          { color: positive ? colors.status.positive : colors.status.negative },
        ]}>
        {amount}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  amount: {
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.black,
    lineHeight: 15,
    marginLeft: spacing[2],
    maxWidth: 126,
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
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.semibold,
    lineHeight: typography.lineHeights.body,
  },
  name: {
    color: colors.content.primary,
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.bold,
    lineHeight: typography.lineHeights.body,
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing[2] + 2,
    minHeight: 56,
    paddingVertical: spacing[2],
  },
});
