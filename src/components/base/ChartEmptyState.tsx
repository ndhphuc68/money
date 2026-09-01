import { StyleSheet, Text, View } from 'react-native';

import { colors, spacing, typography } from '@/theme';

export type ChartEmptyStateProps = {
  message: string;
};

export function ChartEmptyState({ message }: ChartEmptyStateProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[7],
  },
  text: {
    color: colors.content.secondary,
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.medium,
    textAlign: 'center',
  },
});
