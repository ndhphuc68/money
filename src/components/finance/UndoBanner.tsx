import { useEffect, useRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, shadows, spacing, typography } from '@/theme';

type UndoBannerProps = {
  message: string;
  onUndo: () => void;
  onExpire?: () => void;
  durationMs?: number;
};

const DEFAULT_DURATION_MS = 5000;

export function UndoBanner({ message, onUndo, onExpire, durationMs = DEFAULT_DURATION_MS }: UndoBannerProps) {
  const resolvedRef = useRef(false);

  useEffect(() => {
    resolvedRef.current = false;
    const timer = setTimeout(() => {
      if (!resolvedRef.current) {
        resolvedRef.current = true;
        onExpire?.();
      }
    }, durationMs);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [durationMs]);

  function handleUndoPress() {
    if (resolvedRef.current) {
      return;
    }
    resolvedRef.current = true;
    onUndo();
  }

  return (
    <View accessibilityLiveRegion="polite" style={styles.container}>
      <Text style={styles.message}>{message}</Text>
      <Pressable
        accessibilityLabel="Hoan tac"
        accessibilityRole="button"
        onPress={handleUndoPress}
        style={({ pressed }) => [styles.undoButton, pressed && styles.undoButtonPressed]}
      >
        <Text style={styles.undoText}>Hoan tac</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...shadows.elevated,
    alignItems: 'center',
    backgroundColor: colors.content.primary,
    borderRadius: radius.md,
    flexDirection: 'row',
    gap: spacing[3],
    justifyContent: 'space-between',
    minHeight: 52,
    paddingHorizontal: spacing[4],
  },
  message: {
    color: colors.content.inverse,
    flex: 1,
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.semibold,
  },
  undoButton: {
    justifyContent: 'center',
    minHeight: 36,
    paddingHorizontal: spacing[2],
  },
  undoButtonPressed: {
    opacity: 0.7,
  },
  undoText: {
    color: colors.brand.tint,
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.bold,
  },
});
