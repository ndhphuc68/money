jest.mock('@/data/local/db/provider', () => {
  const React = require('react');

  return {
    LocalDatabaseProvider: ({ children }: { children: React.ReactNode }) => children,
    useLocalDatabase: () => ({ db: {}, close: async () => undefined }),
  };
});

import { renderRouter } from 'expo-router/testing-library';

describe('root navigation', () => {
  it('renders the actual root route with a visible passphrase setup state before sync actions are available', () => {
    const screen = renderRouter({ appDir: './src/app', overrides: {} }, { initialUrl: '/' });

    expect(screen.getPathname()).toBe('/');
    expect(screen.getByText('Offline First Sync')).toBeTruthy();
    expect(screen.getByText('Set a shared passphrase before importing or exporting.')).toBeTruthy();
    expect(screen.getByLabelText('Shared passphrase')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Export sync package' }).props.accessibilityState).toEqual({ disabled: true });
    expect(screen.getByRole('button', { name: 'Import sync package' }).props.accessibilityState).toEqual({ disabled: true });
  });
});
