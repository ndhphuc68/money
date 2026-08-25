import React from 'react';
import { render } from '@testing-library/react-native';
import { SyncScreen } from '@/features/sync/screens/sync-screen';
import { translate } from '@/i18n/translations';

describe('Expo foundation', () => {
  it('loads the default app screen', () => {
    const t = translate.bind(null, 'vi' as const);
    const screen = render(React.createElement(SyncScreen, {
      exportPackage: async () => undefined,
      importPackage: async () => undefined,
      isWorking: false,
      result: null,
      error: null,
      passphrase: '',
      setPassphrase: () => undefined,
      isConfigured: false,
      locale: 'vi',
      setLocale: () => undefined,
      t,
    }));

    expect(screen.getByText('Dong bo ngoai tuyen')).toBeTruthy();
  });
});
