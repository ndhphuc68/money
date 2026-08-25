import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, shadows, spacing, typography } from '@/theme';

type BalanceCardProps = {
  label: string;
  balance: string;
  cardNumber: string;
  expiry: string;
  masked?: boolean;
  maskedText?: string;
  onToggleMask?: () => void;
};

export function BalanceCard({
  label,
  balance,
  cardNumber,
  expiry,
  masked = false,
  maskedText = '•• ••• •••',
  onToggleMask,
}: BalanceCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.label}>{label}</Text>
        <Pressable
          accessibilityLabel={masked ? 'Show balance' : 'Hide balance'}
          accessibilityRole="button"
          onPress={onToggleMask}
          style={({ pressed }) => [styles.maskButton, pressed && styles.maskButtonPressed]}
        >
          <Text style={styles.maskIcon}>{masked ? '+' : '-'}</Text>
        </Pressable>
      </View>
      <Text adjustsFontSizeToFit numberOfLines={1} style={styles.balance}>
        {masked ? maskedText : balance}
      </Text>
      <View style={styles.footer}>
        <Text numberOfLines={1} style={styles.cardNumber}>{cardNumber}</Text>
        <Text style={styles.expiry}>{expiry}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  balance: {
    color: colors.content.inverse,
    fontSize: typography.sizes.display,
    fontWeight: typography.weights.black,
    lineHeight: typography.lineHeights.display,
    marginBottom: spacing[5],
    marginTop: spacing[3],
  },
  card: {
    ...shadows.elevated,
    backgroundColor: colors.gradient.balance[0],
    borderRadius: radius.xl,
    padding: 22,
  },
  cardNumber: {
    color: colors.content.inverse,
    flex: 1,
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.semibold,
    letterSpacing: 2,
    opacity: 0.9,
  },
  expiry: {
    color: colors.content.inverse,
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.semibold,
    opacity: 0.75,
  },
  footer: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing[3],
    justifyContent: 'space-between',
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  label: {
    color: colors.content.inverse,
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.semibold,
    opacity: 0.8,
  },
  maskButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: radius.circle,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  maskButtonPressed: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  maskIcon: {
    color: colors.content.inverse,
    fontSize: typography.sizes.heading,
    fontWeight: typography.weights.black,
    lineHeight: typography.lineHeights.heading,
  },
});
