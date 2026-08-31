import { X } from 'lucide-react-native';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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
  const insets = useSafeAreaInsets();

  return (
    <Modal animationType="slide" onRequestClose={onClose} transparent visible={visible}>
      <Pressable
        onPress={onClose}
        style={[styles.backdrop, { paddingBottom: spacing[5] + insets.bottom }]}>
        <Pressable onPress={(event) => event.stopPropagation()} style={styles.sheet}>
          <View style={styles.header}>
            <View style={styles.headerText}>
              <Text style={styles.title}>{title}</Text>
              <Text style={styles.subtitle}>{subtitle}</Text>
            </View>
            <Pressable
              accessibilityLabel={closeLabel}
              accessibilityRole="button"
              onPress={onClose}
              style={styles.closeButton}>
              <X color={colors.content.primary} size={20} strokeWidth={2.2} />
            </Pressable>
          </View>
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
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  actions: {
    flexDirection: 'row',
    gap: spacing[3],
    marginTop: spacing[5],
  },
  backdrop: {
    backgroundColor: 'rgba(16,24,40,0.32)',
    flex: 1,
    justifyContent: 'flex-end',
    padding: spacing[5],
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
  closeButton: {
    alignItems: 'center',
    backgroundColor: colors.surface.muted,
    borderRadius: radius.circle,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  header: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing[3],
  },
  headerText: {
    flex: 1,
    minWidth: 0,
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
  sheet: {
    backgroundColor: colors.surface.primary,
    borderRadius: radius.xl,
    padding: spacing[5],
  },
  subtitle: {
    color: colors.content.secondary,
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.semibold,
    marginTop: spacing[1],
  },
  title: {
    color: colors.content.primary,
    fontSize: typography.sizes.heading,
    fontWeight: typography.weights.black,
  },
});
