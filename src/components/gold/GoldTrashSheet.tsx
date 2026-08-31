import { X } from 'lucide-react-native';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';

import { Card, IconButton, ListRow, Sheet } from '@/components/base';
import type { LotHistoryRow, SaleHistoryRow } from '@/features/gold/view-models/gold-presentation';
import { colors, radius, spacing, typography } from '@/theme';

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
    <Sheet
      closeLabel={closeLabel}
      onClose={onClose}
      subtitle={subtitle}
      title={title}
      visible={visible}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <Card padding={0} style={styles.card}>
          {rows.map((row, index) => (
            <ListRow
              gap={spacing[3]}
              key={row.key}
              minHeight={68}
              showDivider={index < rows.length - 1}
              subtitle={row.subtitle}
              subtitleStyle={styles.rowSubtitle}
              title={row.title}
              titleStyle={styles.rowTitle}
              trailing={
                <>
                  <Pressable
                    accessibilityRole="button"
                    onPress={row.onRestore}
                    style={styles.restoreButton}>
                    <Text style={styles.restoreButtonText}>{restoreLabel}</Text>
                  </Pressable>
                  <IconButton
                    accessibilityLabel={purgeLabel}
                    backgroundColor={colors.status.negativeSoft}
                    icon={<X color={colors.status.negative} size={18} strokeWidth={2.2} />}
                    onPress={row.onPurge}
                    radius="md"
                    style={styles.purgeButton}
                  />
                </>
              }
            />
          ))}
        </Card>
      </ScrollView>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  card: {
    paddingHorizontal: spacing[4],
  },
  purgeButton: {
    flexShrink: 0,
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
  rowSubtitle: {
    marginTop: spacing[1],
  },
  rowTitle: {
    fontSize: typography.sizes.caption,
  },
});
