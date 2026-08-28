import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import type { LotHistoryRow, SaleHistoryRow } from '@/features/gold/view-models/gold-presentation';
import { colors, radius, shadows, spacing, typography } from '@/theme';

export type GoldTrashSheetProps = {
  visible: boolean;
  title: string;
  subtitle: string;
  closeLabel: string;
  restoreLabel: string;
  purgeLabel: string;
  trashedLots: LotHistoryRow[];
  trashedSales: SaleHistoryRow[];
  onRestoreLot(id: string): void;
  onRestoreSale(id: string): void;
  onPurgeLot(id: string): void;
  onPurgeSale(id: string): void;
  onClose(): void;
};

type TrashRow = {
  key: string;
  title: string;
  subtitle: string;
  onRestore(): void;
  onPurge(): void;
};

export function GoldTrashSheet({
  visible,
  title,
  subtitle,
  closeLabel,
  restoreLabel,
  purgeLabel,
  trashedLots,
  trashedSales,
  onRestoreLot,
  onRestoreSale,
  onPurgeLot,
  onPurgeSale,
  onClose,
}: GoldTrashSheetProps) {
  const rows: TrashRow[] = [
    ...trashedLots.map((lot) => ({
      key: `lot-${lot.id}`,
      title: lot.title,
      subtitle: lot.subtitle,
      onRestore: () => onRestoreLot(lot.id),
      onPurge: () => onPurgeLot(lot.id),
    })),
    ...trashedSales.map((sale) => ({
      key: `sale-${sale.id}`,
      title: sale.title,
      subtitle: sale.subtitle,
      onRestore: () => onRestoreSale(sale.id),
      onPurge: () => onPurgeSale(sale.id),
    })),
  ];

  return (
    <Modal animationType="fade" onRequestClose={onClose} transparent visible={visible}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <ScrollView showsVerticalScrollIndicator={false}>
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
              {rows.map((row, index) => (
                <View key={row.key} style={[styles.row, index < rows.length - 1 && styles.rowDivider]}>
                  <View style={styles.rowText}>
                    <Text numberOfLines={1} style={styles.rowTitle}>{row.title}</Text>
                    <Text numberOfLines={1} style={styles.rowSubtitle}>{row.subtitle}</Text>
                  </View>
                  <Pressable accessibilityRole="button" onPress={row.onRestore} style={styles.restoreButton}>
                    <Text style={styles.restoreButtonText}>{restoreLabel}</Text>
                  </Pressable>
                  <Pressable accessibilityLabel={purgeLabel} accessibilityRole="button" onPress={row.onPurge} style={styles.purgeButton}>
                    <Text style={styles.purgeButtonText}>×</Text>
                  </Pressable>
                </View>
              ))}
            </View>
          </ScrollView>
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
  card: {
    ...shadows.card,
    backgroundColor: colors.surface.primary,
    borderRadius: radius.lg,
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
    marginBottom: spacing[4],
  },
  headerText: {
    flex: 1,
    minWidth: 0,
  },
  purgeButton: {
    alignItems: 'center',
    backgroundColor: colors.status.negativeSoft,
    borderRadius: radius.md,
    flexShrink: 0,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  purgeButtonText: {
    color: colors.status.negative,
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.bold,
  },
  restoreButton: {
    alignItems: 'center',
    backgroundColor: colors.surface.muted,
    borderRadius: radius.md,
    flexShrink: 0,
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: spacing[3],
  },
  restoreButtonText: {
    color: colors.content.primary,
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.black,
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing[3],
    minHeight: 68,
  },
  rowDivider: {
    borderBottomColor: colors.border.subtle,
    borderBottomWidth: 1,
  },
  rowSubtitle: {
    color: colors.content.secondary,
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.semibold,
    marginTop: spacing[1],
  },
  rowText: {
    flex: 1,
    minWidth: 0,
  },
  rowTitle: {
    color: colors.content.primary,
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.black,
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
