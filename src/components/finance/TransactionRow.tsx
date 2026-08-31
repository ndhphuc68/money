import { StyleSheet, Text } from 'react-native';

import { ListRow } from '@/components/base';
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
    <ListRow
      dividerColor={colors.divider}
      gap={spacing[2] + 2}
      leading={<CategoryIcon name={icon} />}
      minHeight={56}
      showDivider={showDivider}
      style={styles.row}
      subtitle={`${category} · ${meta}`}
      subtitleStyle={styles.subtitle}
      title={name}
      titleStyle={styles.title}
      trailing={
        <Text
          numberOfLines={1}
          style={[
            styles.amount,
            { color: positive ? colors.status.positive : colors.status.negative },
          ]}>
          {amount}
        </Text>
      }
    />
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
  row: {
    paddingVertical: spacing[2],
  },
  subtitle: {
    color: colors.content.muted,
    fontSize: typography.sizes.body,
    lineHeight: typography.lineHeights.body,
  },
  title: {
    fontWeight: typography.weights.bold,
    lineHeight: typography.lineHeights.body,
  },
});
