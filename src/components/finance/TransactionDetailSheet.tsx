import { Alert, StyleSheet, Text, View } from 'react-native';

import { PrimaryButton, Sheet } from '@/components/base';
import { CategoryIcon, type CategoryIconName } from '@/components/finance/icons';
import { colors, radius, shadows, spacing, typography } from '@/theme';

export type TransactionDetailData = {
  id: string;
  name: string;
  type: 'expense' | 'income' | 'transfer';
  typeLabel: string;
  amountLabel: string;
  positive: boolean;
  categoryLabel?: string | null;
  categoryIcon?: string | CategoryIconName;
  categoryColor?: string;
  accountName: string;
  destinationAccountName?: string | null;
  dateLabel: string;
  note?: string | null;
};

export type TransactionDetailSheetProps = {
  visible: boolean;
  detail: TransactionDetailData | null;
  loading?: boolean;
  closeLabel: string;
  title: string;
  deleteLabel: string;
  deleteConfirmTitle: string;
  deleteConfirmMessage: string;
  deleteConfirmCancel: string;
  deleteConfirmConfirm: string;
  labels: {
    type: string;
    category: string;
    account: string;
    destination: string;
    date: string;
    note: string;
  };
  onDelete(id: string): void;
  onClose(): void;
};

export function TransactionDetailSheet({
  visible,
  detail,
  loading = false,
  closeLabel,
  title,
  deleteLabel,
  deleteConfirmTitle,
  deleteConfirmMessage,
  deleteConfirmCancel,
  deleteConfirmConfirm,
  labels,
  onDelete,
  onClose,
}: TransactionDetailSheetProps) {
  function handlePressDelete() {
    if (!detail) return;
    Alert.alert(deleteConfirmTitle, deleteConfirmMessage.replace('{name}', detail.name), [
      { text: deleteConfirmCancel, style: 'cancel' },
      {
        text: deleteConfirmConfirm,
        style: 'destructive',
        onPress: () => {
          onDelete(detail.id);
          onClose();
        },
      },
    ]);
  }

  const typeTone =
    detail?.type === 'income'
      ? { bg: colors.status.positiveSoft, text: colors.status.positive }
      : detail?.type === 'expense'
        ? { bg: colors.status.negativeSoft, text: colors.status.negative }
        : { bg: colors.brand.soft, text: colors.brand.primary };

  return (
    <Sheet closeLabel={closeLabel} onClose={onClose} title={title} visible={visible}>
      {loading || !detail ? (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>...</Text>
        </View>
      ) : (
        <View style={styles.content}>
          <View style={styles.heroCard}>
            <View style={styles.heroTopRow}>
              {detail.categoryIcon ? (
                <CategoryIcon
                  color={detail.categoryColor}
                  icon={typeof detail.categoryIcon === 'string' ? detail.categoryIcon : undefined}
                  name={
                    typeof detail.categoryIcon === 'string'
                      ? undefined
                      : (detail.categoryIcon as CategoryIconName)
                  }
                  size={52}
                />
              ) : null}
              <View style={styles.heroTitleWrapper}>
                <Text numberOfLines={2} style={styles.heroName}>
                  {detail.name}
                </Text>
                <View style={[styles.typeBadge, { backgroundColor: typeTone.bg }]}>
                  <Text style={[styles.typeBadgeText, { color: typeTone.text }]}>
                    {detail.typeLabel}
                  </Text>
                </View>
              </View>
            </View>

            <Text
              style={[
                styles.amountText,
                detail.positive ? styles.amountPositive : styles.amountDefault,
              ]}>
              {detail.amountLabel}
            </Text>
          </View>

          <View style={styles.detailsCard}>
            <View style={[styles.row, styles.rowDivider]}>
              <Text style={styles.rowLabel}>{labels.type}</Text>
              <Text style={styles.rowValue}>{detail.typeLabel}</Text>
            </View>

            {detail.type !== 'transfer' && detail.categoryLabel ? (
              <View style={[styles.row, styles.rowDivider]}>
                <Text style={styles.rowLabel}>{labels.category}</Text>
                <Text style={styles.rowValue}>{detail.categoryLabel}</Text>
              </View>
            ) : null}

            <View
              style={[
                styles.row,
                (Boolean(detail.destinationAccountName) || Boolean(detail.note)) &&
                  styles.rowDivider,
              ]}>
              <Text style={styles.rowLabel}>{labels.account}</Text>
              <Text style={styles.rowValue}>{detail.accountName}</Text>
            </View>

            {detail.destinationAccountName ? (
              <View style={[styles.row, Boolean(detail.note) && styles.rowDivider]}>
                <Text style={styles.rowLabel}>{labels.destination}</Text>
                <Text style={styles.rowValue}>{detail.destinationAccountName}</Text>
              </View>
            ) : null}

            <View style={[styles.row, Boolean(detail.note) && styles.rowDivider]}>
              <Text style={styles.rowLabel}>{labels.date}</Text>
              <Text style={styles.rowValue}>{detail.dateLabel}</Text>
            </View>

            {detail.note ? (
              <View style={styles.noteRow}>
                <Text style={styles.rowLabel}>{labels.note}</Text>
                <Text style={styles.noteValue}>{detail.note}</Text>
              </View>
            ) : null}
          </View>

          <PrimaryButton
            backgroundColor={colors.status.negative}
            label={deleteLabel}
            onPress={handlePressDelete}
            pressedBackgroundColor={colors.status.negative}
            radius="sm"
            style={styles.deleteButton}
          />
        </View>
      )}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  amountDefault: {
    color: colors.content.primary,
  },
  amountPositive: {
    color: colors.status.positive,
  },
  amountText: {
    fontSize: typography.sizes.display,
    fontWeight: typography.weights.black,
    marginTop: spacing[2],
  },
  content: {
    gap: spacing[4],
    paddingBottom: spacing[4],
  },
  deleteButton: {
    marginTop: spacing[2],
  },
  detailsCard: {
    ...shadows.card,
    backgroundColor: colors.surface.primary,
    borderRadius: radius.lg,
    paddingHorizontal: spacing[4],
  },
  heroCard: {
    ...shadows.card,
    alignItems: 'center',
    backgroundColor: colors.surface.primary,
    borderRadius: radius.lg,
    gap: spacing[2],
    padding: spacing[4],
  },
  heroName: {
    color: colors.content.primary,
    fontSize: typography.sizes.heading,
    fontWeight: typography.weights.bold,
  },
  heroTitleWrapper: {
    alignItems: 'center',
    gap: spacing[1],
  },
  heroTopRow: {
    alignItems: 'center',
    gap: spacing[2],
  },
  loadingContainer: {
    paddingVertical: spacing[6],
  },
  loadingText: {
    color: colors.content.secondary,
    fontSize: typography.sizes.body,
    textAlign: 'center',
  },
  noteRow: {
    gap: spacing[1],
    paddingVertical: spacing[3],
  },
  noteValue: {
    color: colors.content.primary,
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.medium,
    lineHeight: typography.lineHeights.body,
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing[3],
  },
  rowDivider: {
    borderBottomColor: colors.border.subtle,
    borderBottomWidth: 1,
  },
  rowLabel: {
    color: colors.content.secondary,
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.semibold,
  },
  rowValue: {
    color: colors.content.primary,
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.bold,
  },
  typeBadge: {
    borderRadius: radius.pill,
    paddingHorizontal: spacing[2],
    paddingVertical: 2,
  },
  typeBadgeText: {
    fontSize: typography.sizes.micro,
    fontWeight: typography.weights.bold,
  },
});
