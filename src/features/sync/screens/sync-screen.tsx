import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import type { SyncViewModel } from '@/features/sync/view-models/use-sync';
import { colors } from '@/theme/colors';

export function SyncScreen({
  exportPackage,
  importPackage,
  isWorking,
  result,
  error,
  passphrase,
  setPassphrase,
  isConfigured,
}: SyncViewModel) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Offline First Sync</Text>
      <Text style={styles.description}>Transfer a signed sync package between devices.</Text>
      <Text style={styles.label}>Shared passphrase</Text>
      <TextInput
        accessibilityLabel="Shared passphrase"
        autoCapitalize="none"
        autoCorrect={false}
        onChangeText={setPassphrase}
        placeholder="Enter the passphrase used by the other device"
        placeholderTextColor={colors.content.placeholder}
        secureTextEntry
        style={styles.passphraseInput}
        value={passphrase}
      />
      {!isConfigured ? <Text accessibilityRole="alert" style={styles.error}>Set a shared passphrase before importing or exporting.</Text> : null}
      <View style={styles.actions}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Export sync package"
          accessibilityState={{ disabled: isWorking || !isConfigured }}
          disabled={isWorking || !isConfigured}
          onPress={exportPackage}
          style={({ pressed }) => [styles.primaryAction, (pressed || isWorking) && styles.primaryActionPressed]}
        >
          <Text style={styles.primaryActionText}>Export sync package</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Import sync package"
          accessibilityState={{ disabled: isWorking || !isConfigured }}
          disabled={isWorking || !isConfigured}
          onPress={importPackage}
          style={({ pressed }) => [styles.secondaryAction, (pressed || isWorking) && styles.secondaryActionPressed]}
        >
          <Text style={styles.secondaryActionText}>Import sync package</Text>
        </Pressable>
      </View>
      {isWorking ? <Text accessibilityLiveRegion="polite" style={styles.status}>Working…</Text> : null}
      {result !== null ? <Text accessibilityLiveRegion="polite" style={styles.status}>{result}</Text> : null}
      {error !== null ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  actions: {
    gap: 12,
    marginTop: 32,
    width: '100%',
  },
  container: {
    backgroundColor: colors.surface.canvas,
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  description: {
    color: colors.content.secondary,
    fontSize: 16,
    lineHeight: 24,
  },
  primaryAction: {
    alignItems: 'center',
    backgroundColor: colors.brand.primary,
    borderRadius: 8,
    justifyContent: 'center',
    minHeight: 48,
    paddingHorizontal: 16,
  },
  primaryActionText: {
    color: colors.content.inverse,
    fontSize: 16,
    fontWeight: '600',
  },
  primaryActionPressed: {
    backgroundColor: colors.brand.primaryPressed,
  },
  secondaryAction: {
    alignItems: 'center',
    backgroundColor: colors.surface.primary,
    borderColor: colors.brand.primary,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 48,
    paddingHorizontal: 16,
  },
  secondaryActionText: {
    color: colors.brand.primaryPressed,
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryActionPressed: {
    backgroundColor: colors.brand.soft,
  },
  status: {
    color: colors.status.positive,
    fontSize: 16,
    lineHeight: 24,
    marginTop: 24,
  },
  error: {
    color: colors.status.negative,
    fontSize: 16,
    lineHeight: 24,
    marginTop: 24,
  },
  label: {
    color: colors.content.primary,
    fontSize: 16,
    fontWeight: '600',
    marginTop: 24,
    marginBottom: 8,
  },
  passphraseInput: {
    backgroundColor: colors.surface.input,
    borderColor: colors.border.strong,
    borderRadius: 8,
    borderWidth: 1,
    fontSize: 16,
    minHeight: 48,
    paddingHorizontal: 12,
    color: colors.content.primary,
  },
  title: {
    color: colors.content.primary,
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 8,
  },
});
