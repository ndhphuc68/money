import type { ReactNode } from 'react';
import { useEffect, useRef } from 'react';
import {
  Animated,
  Modal,
  PanResponder,
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

  const translateY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      translateY.setValue(0);
    }
  }, [visible, translateY]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return (
          showHandle && gestureState.dy > 6 && Math.abs(gestureState.dx) < Math.abs(gestureState.dy)
        );
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          translateY.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 90 || gestureState.vy > 0.4) {
          Animated.timing(translateY, {
            toValue: 500,
            duration: 180,
            useNativeDriver: true,
          }).start(() => {
            onClose();
            translateY.setValue(0);
          });
        } else {
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
            bounciness: 4,
          }).start();
        }
      },
    }),
  ).current;

  const Container = onBodyPress ? Pressable : View;

  return (
    <Modal animationType="slide" onRequestClose={onClose} transparent visible={visible}>
      <View
        style={[
          styles.backdrop,
          isDialog ? { padding: spacing[5], paddingBottom: spacing[5] + bottomInset } : null,
        ]}>
        <Pressable
          accessibilityLabel="Backdrop"
          onPress={onClose}
          style={StyleSheet.absoluteFillObject}
        />
        <Animated.View
          style={[
            isDialog ? styles.dialogSheet : styles.bottomSheet,
            !isDialog ? { paddingBottom: spacing[5] + bottomInset } : null,
            !isDialog ? { transform: [{ translateY }] } : null,
            style,
          ]}>
          <Container onPress={onBodyPress}>
            {showHandle ? (
              <View style={styles.handleContainer} {...panResponder.panHandlers}>
                <View style={styles.handle} />
              </View>
            ) : null}
            {title ? (
              <View style={styles.header} {...(showHandle ? panResponder.panHandlers : {})}>
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
          </Container>
        </Animated.View>
      </View>
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
    marginBottom: spacing[2],
    width: 44,
  },
  handleContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  header: {
    alignItems: 'center',
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
