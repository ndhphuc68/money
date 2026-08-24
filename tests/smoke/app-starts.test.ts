import React from 'react';
import { render } from '@testing-library/react-native';
import { SyncScreen } from '@/features/sync/screens/sync-screen';

describe('Expo foundation', () => {
  it('loads the default app screen', () => {
    const screen = render(React.createElement(SyncScreen, {
      exportPackage: async () => undefined,
      importPackage: async () => undefined,
      isWorking: false,
      result: null,
      error: null,
      passphrase: '',
      setPassphrase: () => undefined,
      isConfigured: false,
    }));

    expect(screen.getByText('Offline First Sync')).toBeTruthy();
  });
});
