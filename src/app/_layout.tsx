import { Stack } from 'expo-router';

import { LocalDatabaseProvider } from '@/data/local/db/provider';

export default function RootLayout() {
  return (
    <LocalDatabaseProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </LocalDatabaseProvider>
  );
}
