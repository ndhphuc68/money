import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Sheet } from '@/components/base';
import { colors, radius, spacing, typography } from '@/theme';

export type GoldActionPickerSheetProps = {
  visible: boolean;
  title: string;
  subtitle: string;
  buyTitle: string;
  buySubtitle: string;
  sellTitle: string;
  sellSubtitle: string;
  sellDisabled: boolean;
  sellDisabledHint: string;
  closeLabel: string;
  onSelectBuy(): void;
  onSelectSell(): void;
  onClose(): void;
};

export function GoldActionPickerSheet({
  visible,
  title,
  subtitle,
  buyTitle,
  buySubtitle,
  sellTitle,
  sellSubtitle,
  sellDisabled,
  sellDisabledHint,
  closeLabel,
  onSelectBuy,
  onSelectSell,
  onClose,
}: GoldActionPickerSheetProps) {
  return (
    <Sheet
      closeButtonBackgroundColor={colors.surface.muted}
      closeLabel={closeLabel}
      onClose={onClose}
      subtitle={subtitle}
      title={title}
      variant="dialog"
      visible={visible}>
      <View style={styles.actions}>
        <Pressable accessibilityRole="button" onPress={onSelectBuy} style={styles.buyAction}>
          <Text style={styles.buyActionTitle}>{buyTitle}</Text>
          <Text style={styles.buyActionSubtitle}>{buySubtitle}</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: sellDisabled }}
          disabled={sellDisabled}
          onPress={onSelectSell}
          style={[styles.sellAction, sellDisabled && styles.sellActionDisabled]}>
          <Text style={styles.sellActionTitle}>{sellTitle}</Text>
          <Text style={styles.sellActionSubtitle}>
            {sellDisabled ? sellDisabledHint : sellSubtitle}
          </Text>
        </Pressable>
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  actions: {
    flexDirection: 'row',
    gap: spacing[3],
    marginTop: spacing[5],
  },
  buyAction: {
    backgroundColor: '#FFF4D6',
    borderRadius: radius.lg,
    flex: 1,
    minHeight: 96,
    padding: spacing[4],
  },
  buyActionSubtitle: {
    color: '#A96308',
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.semibold,
    marginTop: spacing[1],
  },
  buyActionTitle: {
    color: '#A96308',
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.black,
  },
  sellAction: {
    backgroundColor: colors.status.positiveSoft,
    borderRadius: radius.lg,
    flex: 1,
    minHeight: 96,
    padding: spacing[4],
  },
  sellActionDisabled: {
    opacity: 0.5,
  },
  sellActionSubtitle: {
    color: colors.status.positive,
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.semibold,
    marginTop: spacing[1],
  },
  sellActionTitle: {
    color: colors.status.positive,
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.black,
  },
});
