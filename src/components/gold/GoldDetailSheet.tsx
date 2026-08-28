import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

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
    <Modal animationType="fade" onRequestClose={onClose} transparent visible={visible}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <View style={styles.headerText}>
              <Text style={styles.title}>{title}</Text>
              <Text style={styles.subtitle}>{subtitle}</Text>
            </View>
            <Pressable accessibilityLabel={closeLabel} accessibilityRole="button" onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>×</Text>
            </Pressable>
          </View>

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

          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: deleteDisabled }}
            disabled={deleteDisabled}
            onPress={onMoveToTrash}
            style={[styles.deleteButton, deleteDisabled && styles.deleteButtonDisabled]}
          >
            <Text style={styles.deleteButtonText}>{deleteLabel}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: 'rgba(16,24,40,0.48)',
    flex: 1,
    justifyContent: 'flex-end',
  },
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
  closeButton: {
    alignItems: 'center',
    backgroundColor: colors.surface.primary,
    borderRadius: radius.circle,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  closeButtonText: {
    color: colors.content.primary,
    fontSize: typography.sizes.heading,
    fontWeight: typography.weights.bold,
  },
  deleteButton: {
    alignItems: 'center',
    backgroundColor: colors.status.negative,
    borderRadius: radius.lg,
    justifyContent: 'center',
    marginTop: spacing[4],
    minHeight: 52,
  },
  deleteButtonDisabled: {
    opacity: 0.5,
  },
  deleteButtonText: {
    color: colors.content.inverse,
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.black,
  },
  handle: {
    alignSelf: 'center',
    backgroundColor: colors.border.strong,
    borderRadius: radius.sm,
    height: 5,
    marginBottom: spacing[3],
    width: 44,
  },
  header: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing[3],
    justifyContent: 'space-between',
  },
  headerText: {
    flex: 1,
    minWidth: 0,
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
  sheet: {
    backgroundColor: colors.surface.canvas,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    maxHeight: '86%',
    padding: spacing[5],
  },
  subtitle: {
    color: colors.content.secondary,
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.semibold,
    marginTop: spacing[1],
  },
  title: {
    color: colors.content.primary,
    fontSize: typography.sizes.heading,
    fontWeight: typography.weights.black,
  },
});
