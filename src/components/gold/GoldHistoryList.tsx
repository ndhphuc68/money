// src/components/gold/GoldHistoryList.tsx
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ArrowUpRight, Coins } from 'lucide-react-native';

import { Card, ListRow } from '@/components/base';
import { colors, radius, spacing, typography } from '@/theme';

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

export function GoldHistoryList({
  items,
  emptyLabel,
  historyTitle,
  trashLabel,
  onSelectItem,
  onOpenTrash,
}: GoldHistoryListProps) {
  return (
    <View>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{historyTitle}</Text>
        <Pressable accessibilityLabel={trashLabel} accessibilityRole="button" onPress={onOpenTrash}>
          <Text style={styles.trashLink}>{trashLabel}</Text>
        </Pressable>
      </View>
      {items.length === 0 ? (
        <Card padding={spacing[5]}>
          <Text style={styles.emptyText}>{emptyLabel}</Text>
        </Card>
      ) : (
        <Card padding={0} style={styles.card}>
          {items.map((item, index) => (
            <ListRow
              gap={spacing[3]}
              key={`${item.kind}-${item.id}`}
              leading={
                <View
                  style={[
                    styles.rowBadge,
                    item.kind === 'sale' ? styles.rowBadgeSale : styles.rowBadgeLot,
                  ]}>
                  {item.kind === 'sale' ? (
                    <ArrowUpRight color={colors.status.positive} size={18} strokeWidth={2} />
                  ) : (
                    <Coins color="#A96308" size={18} strokeWidth={1.8} />
                  )}
                </View>
              }
              minHeight={64}
              onPress={() => onSelectItem(item)}
              showDivider={index < items.length - 1}
              style={styles.row}
              subtitle={item.subtitle}
              subtitleStyle={styles.rowSubtitle}
              title={item.title}
              trailing={
                <Text
                  style={[
                    styles.rowAmount,
                    item.amountTone === 'positive' && styles.rowAmountPositive,
                  ]}>
                  {item.amountLabel}
                </Text>
              }
            />
          ))}
        </Card>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    paddingHorizontal: spacing[4],
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
  rowSubtitle: {
    marginTop: spacing[1],
  },
  trashLink: {
    color: colors.content.secondary,
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.black,
  },
});
