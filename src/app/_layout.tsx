import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { LocalDatabaseProvider } from '@/data/local/db/provider';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <LocalDatabaseProvider>
        <Stack screenOptions={{ headerShown: false }} />
      </LocalDatabaseProvider>
    </SafeAreaProvider>
  );
}
