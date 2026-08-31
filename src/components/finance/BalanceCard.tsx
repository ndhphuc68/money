import { StyleSheet, Text, View } from 'react-native';
import { Eye, EyeOff } from 'lucide-react-native';

import { Card, IconButton } from '@/components/base';
import { colors, spacing, typography } from '@/theme';

type BalanceCardProps = {
  label: string;
  balance: string;
  cardNumber: string;
  expiry: string;
  masked?: boolean;
  maskedText?: string;
  onToggleMask?: () => void;
  showBalanceLabel: string;
  hideBalanceLabel: string;
};

export function BalanceCard({
  label,
  balance,
  cardNumber,
  expiry,
  masked = false,
  maskedText = '•• ••• •••',
  onToggleMask,
  showBalanceLabel,
  hideBalanceLabel,
}: BalanceCardProps) {
  return (
    <Card
      backgroundColor={colors.gradient.balance[0]}
      elevation="elevated"
      padding={22}
      radius="xl">
      <View style={styles.header}>
        <Text style={styles.label}>{label}</Text>
        <IconButton
          accessibilityLabel={masked ? showBalanceLabel : hideBalanceLabel}
          backgroundColor="rgba(255, 255, 255, 0.15)"
          icon={
            masked ? (
              <Eye color={colors.content.inverse} size={18} />
            ) : (
              <EyeOff color={colors.content.inverse} size={18} />
            )
          }
          onPress={onToggleMask}
          pressedBackgroundColor="rgba(255, 255, 255, 0.25)"
        />
      </View>
      <Text adjustsFontSizeToFit numberOfLines={1} style={styles.balance}>
        {masked ? maskedText : balance}
      </Text>
      <View style={styles.footer}>
        <Text numberOfLines={1} style={styles.cardNumber}>
          {cardNumber}
        </Text>
        <Text style={styles.expiry}>{expiry}</Text>
      </View>
    </Card>
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
});
