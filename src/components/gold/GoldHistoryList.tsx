// src/components/gold/GoldHistoryList.tsx
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, shadows, spacing, typography } from '@/theme';

export type GoldHistoryRowKind = 'lot' | 'sale';

export type GoldHistoryItem = {
  kind: GoldHistoryRowKind;
  id: string;
  title: string;
  subtitle: string;
  amountLabel: string;
  amountTone: 'neutral' | 'positive';
};

export type GoldHistoryListProps = {
  items: GoldHistoryItem[];
  emptyLabel: string;
  historyTitle: string;
  trashLabel: string;
  onSelectItem(item: GoldHistoryItem): void;
  onOpenTrash(): void;
};

export function GoldHistoryList({ items, emptyLabel, historyTitle, trashLabel, onSelectItem, onOpenTrash }: GoldHistoryListProps) {
  return (
    <View>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{historyTitle}</Text>
        <Pressable accessibilityLabel={trashLabel} accessibilityRole="button" onPress={onOpenTrash}>
          <Text style={styles.trashLink}>{trashLabel}</Text>
        </Pressable>
      </View>
      {items.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>{emptyLabel}</Text>
        </View>
      ) : (
        <View style={styles.card}>
          {items.map((item, index) => (
            <Pressable
              key={`${item.kind}-${item.id}`}
              accessibilityRole="button"
              onPress={() => onSelectItem(item)}
              style={({ pressed }) => [
                styles.row,
                index < items.length - 1 && styles.rowDivider,
                pressed && styles.rowPressed,
              ]}
            >
              <View style={[styles.rowBadge, item.kind === 'sale' ? styles.rowBadgeSale : styles.rowBadgeLot]}>
                <Text style={[styles.rowBadgeText, item.kind === 'sale' && styles.rowBadgeTextSale]}>
                  {item.kind === 'sale' ? '↗' : 'Au'}
                </Text>
              </View>
              <View style={styles.rowText}>
                <Text numberOfLines={1} style={styles.rowTitle}>{item.title}</Text>
                <Text numberOfLines={1} style={styles.rowSubtitle}>{item.subtitle}</Text>
              </View>
              <Text style={[styles.rowAmount, item.amountTone === 'positive' && styles.rowAmountPositive]}>
                {item.amountLabel}
              </Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    ...shadows.card,
    backgroundColor: colors.surface.primary,
    borderRadius: radius.lg,
    paddingHorizontal: spacing[4],
  },
  emptyCard: {
    ...shadows.card,
    backgroundColor: colors.surface.primary,
    borderRadius: radius.lg,
    padding: spacing[5],
  },
  emptyText: {
    color: colors.content.secondary,
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.semibold,
    textAlign: 'center',
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing[2],
  },
  headerTitle: {
    color: colors.content.secondary,
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.black,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing[3],
    minHeight: 64,
    paddingVertical: spacing[3],
  },
  rowAmount: {
    color: colors.content.primary,
    flexShrink: 0,
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.black,
    textAlign: 'right',
  },
  rowAmountPositive: {
    color: colors.status.positive,
  },
  rowBadge: {
    alignItems: 'center',
    borderRadius: radius.circle,
    flexShrink: 0,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  rowBadgeLot: {
    backgroundColor: '#FFF4D6',
  },
  rowBadgeSale: {
    backgroundColor: colors.status.positiveSoft,
  },
  rowBadgeText: {
    color: '#A96308',
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.black,
  },
  rowBadgeTextSale: {
    color: colors.status.positive,
  },
  rowDivider: {
    borderBottomColor: colors.border.subtle,
    borderBottomWidth: 1,
  },
  rowPressed: {
    backgroundColor: colors.surface.muted,
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
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.black,
  },
  trashLink: {
    color: colors.content.secondary,
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.black,
  },
});
