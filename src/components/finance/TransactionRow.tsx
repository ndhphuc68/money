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
  icon?: string | CategoryIconName;
  color?: string;
  showDivider?: boolean;
};

export function TransactionRow({
  name,
  category,
  meta,
  amount,
  positive,
  icon,
  color,
  showDivider = true,
}: TransactionRowProps) {
  const isSameAsCategory =
    Boolean(category) && name.trim().toLowerCase() === category.trim().toLowerCase();
  const subtitle = isSameAsCategory
    ? meta
    : category && meta
      ? `${category} · ${meta}`
      : category || meta;

  return (
    <ListRow
      dividerColor={colors.divider}
      gap={spacing[2] + 2}
      leading={
        <CategoryIcon
          color={color}
          icon={typeof icon === 'string' ? icon : undefined}
          name={icon && typeof icon !== 'string' ? (icon as CategoryIconName) : undefined}
          size={40}
        />
      }
      minHeight={56}
      showDivider={showDivider}
      style={styles.row}
      subtitle={subtitle}
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
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.black,
    lineHeight: 18,
    marginLeft: spacing[2],
  },
  row: {
    paddingVertical: spacing[2],
  },
  subtitle: {
    color: colors.content.secondary,
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.semibold,
    lineHeight: typography.lineHeights.small,
  },
  title: {
    color: colors.content.primary,
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.bold,
    lineHeight: typography.lineHeights.body,
  },
});
