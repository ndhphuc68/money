import type { ReactNode } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { X } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, radius, spacing, typography } from '@/theme';

import { IconButton } from './IconButton';

export type SheetProps = {
  visible: boolean;
  onClose: () => void;
  subtitle?: string;
  variant?: 'bottomSheet' | 'dialog';
  applyBottomInset?: boolean;
  closeButtonBackgroundColor?: string;
  onBodyPress?: () => void;
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
} & ({ title: string; closeLabel: string } | { title?: undefined; closeLabel?: undefined });

export function Sheet({
  visible,
  onClose,
  title,
  subtitle,
  closeLabel,
  variant = 'bottomSheet',
  applyBottomInset = true,
  closeButtonBackgroundColor = colors.surface.primary,
  onBodyPress,
  style,
  children,
}: SheetProps) {
  const insets = useSafeAreaInsets();
  const isDialog = variant === 'dialog';
  const showHandle = variant === 'bottomSheet';
  const bottomInset = applyBottomInset ? insets.bottom : 0;

  return (
    <Modal animationType="slide" onRequestClose={onClose} transparent visible={visible}>
      <Pressable
        onPress={onClose}
        style={[
          styles.backdrop,
          isDialog ? { padding: spacing[5], paddingBottom: spacing[5] + bottomInset } : null,
        ]}>
        <Pressable
          onPress={(event) => {
            event.stopPropagation();
            onBodyPress?.();
          }}
          style={[
            isDialog ? styles.dialogSheet : styles.bottomSheet,
            !isDialog ? { paddingBottom: spacing[5] + bottomInset } : null,
            style,
          ]}>
          {showHandle ? <View style={styles.handle} /> : null}
          {title ? (
            <View style={styles.header}>
              <View style={styles.headerText}>
                <Text style={styles.title}>{title}</Text>
                {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
              </View>
              <IconButton
                accessibilityLabel={closeLabel ?? ''}
                backgroundColor={closeButtonBackgroundColor}
                icon={<X color={colors.content.primary} size={20} strokeWidth={2.2} />}
                onPress={onClose}
              />
            </View>
          ) : null}
          {children}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: 'rgba(16,24,40,0.32)',
    flex: 1,
    justifyContent: 'flex-end',
  },
  bottomSheet: {
    backgroundColor: colors.surface.canvas,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    maxHeight: '86%',
    padding: spacing[5],
  },
  dialogSheet: {
    backgroundColor: colors.surface.primary,
    borderRadius: radius.xl,
    padding: spacing[5],
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
