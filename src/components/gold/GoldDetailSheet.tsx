import { StyleSheet, Text, View } from 'react-native';

import { PrimaryButton, Sheet } from '@/components/base';
import { colors, radius, spacing, typography } from '@/theme';

export type GoldDetailSheetProps = {
  visible: boolean;
  title: string;
  subtitle: string;
  closeLabel: string;
  weightLabel: string;
  weightValue: string;
  totalLabel: string;
  totalValue: string;
  extraLabel: string;
  extraValue: string;
  blockedMessage: string | null;
  deleteDisabled: boolean;
  deleteLabel: string;
  onMoveToTrash(): void;
  onClose(): void;
};

export function GoldDetailSheet({
  visible,
  title,
  subtitle,
  closeLabel,
  weightLabel,
  weightValue,
  totalLabel,
  totalValue,
  extraLabel,
  extraValue,
  blockedMessage,
  deleteDisabled,
  deleteLabel,
  onMoveToTrash,
  onClose,
}: GoldDetailSheetProps) {
  return (
    <Sheet
      closeLabel={closeLabel}
      onClose={onClose}
      subtitle={subtitle}
      title={title}
      visible={visible}>
      <View style={styles.card}>
        <View style={[styles.row, styles.rowDivider]}>
          <Text style={styles.rowLabel}>{weightLabel}</Text>
          <Text style={styles.rowValue}>{weightValue}</Text>
        </View>
        <View style={[styles.row, styles.rowDivider]}>
          <Text style={styles.rowLabel}>{totalLabel}</Text>
          <Text style={styles.rowValue}>{totalValue}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>{extraLabel}</Text>
          <Text style={styles.rowValue}>{extraValue}</Text>
        </View>
      </View>

      {blockedMessage ? (
        <View style={styles.blockedBanner}>
          <Text style={styles.blockedBannerText}>{blockedMessage}</Text>
        </View>
      ) : null}

      <PrimaryButton
        backgroundColor={colors.status.negative}
        disabled={deleteDisabled}
        label={deleteLabel}
        onPress={onMoveToTrash}
        style={styles.deleteButtonSpacing}
      />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  blockedBanner: {
    backgroundColor: colors.status.negativeSoft,
    borderRadius: radius.md,
    marginTop: spacing[4],
    padding: spacing[3],
  },
  blockedBannerText: {
    color: colors.status.negative,
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.semibold,
    lineHeight: typography.lineHeights.small,
  },
  card: {
    backgroundColor: colors.surface.primary,
    borderRadius: radius.lg,
    marginTop: spacing[4],
    paddingHorizontal: spacing[4],
  },
  deleteButtonSpacing: {
    marginTop: spacing[4],
  },
  row: {
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
});
