// src/components/gold/GoldOverviewCard.tsx
import { StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components/base';
import { colors, radius, spacing, typography } from '@/theme';

export type GoldOverviewCardProps = {
  title: string;
  subtitle: string;
  quantityLabel: string;
  quantityValue: string;
  costBasisLabel: string;
  costBasisValue: string;
};

export function GoldOverviewCard({
  title,
  subtitle,
  quantityLabel,
  quantityValue,
  costBasisLabel,
  costBasisValue,
}: GoldOverviewCardProps) {
  return (
    <Card backgroundColor={colors.category.gold} elevation="none" padding={spacing[5]} radius="xl">
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
        </View>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>Au</Text>
        </View>
      </View>
      <View style={styles.stats}>
        <View style={styles.stat}>
          <Text style={styles.statLabel}>{quantityLabel}</Text>
          <Text numberOfLines={1} style={styles.statValue}>
            {quantityValue}
          </Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statLabel}>{costBasisLabel}</Text>
          <Text numberOfLines={1} style={styles.statValue}>
            {costBasisValue}
          </Text>
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderRadius: radius.circle,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  badgeText: {
    color: colors.content.inverse,
    fontSize: typography.sizes.bodyLg,
    fontWeight: typography.weights.bold,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing[4],
    justifyContent: 'space-between',
    marginBottom: spacing[5],
  },
  headerText: {
    flex: 1,
    minWidth: 0,
  },
  stat: {
    minWidth: 0,
  },
  statLabel: {
    color: colors.content.inverse,
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.bold,
    marginBottom: spacing[1],
    opacity: 0.92,
  },
  statValue: {
    color: colors.content.inverse,
    fontSize: typography.sizes.heading,
    fontWeight: typography.weights.black,
  },
  stats: {
    flexDirection: 'row',
    gap: spacing[5],
  },
  subtitle: {
    color: colors.content.inverse,
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.semibold,
    lineHeight: typography.lineHeights.small,
    opacity: 0.9,
  },
  title: {
    color: colors.content.inverse,
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.black,
    marginBottom: spacing[1],
  },
});
