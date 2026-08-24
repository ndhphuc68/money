import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import type { SyncViewModel } from '@/features/sync/view-models/use-sync';

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
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  description: {
    color: '#475569',
    fontSize: 16,
    lineHeight: 24,
  },
  primaryAction: {
    alignItems: 'center',
    backgroundColor: '#0f766e',
    borderRadius: 8,
    justifyContent: 'center',
    minHeight: 48,
    paddingHorizontal: 16,
  },
  primaryActionText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  primaryActionPressed: {
    opacity: 0.7,
  },
  secondaryAction: {
    alignItems: 'center',
    borderColor: '#0f766e',
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 48,
    paddingHorizontal: 16,
  },
  secondaryActionText: {
    color: '#115e59',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryActionPressed: {
    backgroundColor: '#ccfbf1',
    opacity: 0.7,
  },
  status: {
    color: '#134e4a',
    fontSize: 16,
    lineHeight: 24,
    marginTop: 24,
  },
  error: {
    color: '#b91c1c',
    fontSize: 16,
    lineHeight: 24,
    marginTop: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 24,
    marginBottom: 8,
  },
  passphraseInput: {
    borderColor: '#64748b',
    borderRadius: 8,
    borderWidth: 1,
    fontSize: 16,
    minHeight: 48,
    paddingHorizontal: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 8,
  },
});
