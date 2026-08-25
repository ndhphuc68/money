jest.mock('@/data/local/db/provider', () => {
  const React = require('react');

  return {
    LocalDatabaseProvider: ({ children }: { children: React.ReactNode }) => children,
    useLocalDatabase: () => ({ db: {}, close: async () => undefined }),
  };
});

jest.mock('@/features/finance/finance-dependencies', () => ({
  createFinanceDependencies: async () => ({
    onboarding: {
      resume: async () => ({ step: 'display-name', displayName: '', hasAccount: false, onboardingCompleted: false }),
      getState: async () => ({ step: 'display-name', displayName: '', hasAccount: false, onboardingCompleted: false }),
      saveDisplayName: async () => undefined,
      createFirstAccount: async () => ({}),
      confirmDefaults: async () => [],
    },
  }),
}));

import { fireEvent, waitFor } from '@testing-library/react-native';
import { renderRouter } from 'expo-router/testing-library';

describe('root navigation', () => {
  it('starts a fresh database at the onboarding display-name step instead of the sync screen', async () => {
    const screen = renderRouter({ appDir: './src/app', overrides: {} }, { initialUrl: '/' });

    expect(screen.getPathname()).toBe('/');
    await waitFor(() => expect(screen.getByLabelText('Tên hiển thị')).toBeTruthy());
    expect(screen.queryByText('Đồng bộ ngoại tuyến')).toBeNull();
  });

  it('still renders the sync screen at /sync, in Vietnamese by default before sync actions are available', () => {
    const screen = renderRouter({ appDir: './src/app', overrides: {} }, { initialUrl: '/sync' });

    expect(screen.getPathname()).toBe('/sync');
    expect(screen.getByText('Đồng bộ ngoại tuyến')).toBeTruthy();
    expect(screen.getByText('Hãy đặt cụm mật khẩu chung trước khi nhập hoặc xuất.')).toBeTruthy();
    expect(screen.getByLabelText('Cụm mật khẩu chung')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Xuất gói đồng bộ' }).props.accessibilityState).toEqual({ disabled: true });
    expect(screen.getByRole('button', { name: 'Nhập gói đồng bộ' }).props.accessibilityState).toEqual({ disabled: true });
  });

  it('switches visible sync labels to English when English is selected', () => {
    const screen = renderRouter({ appDir: './src/app', overrides: {} }, { initialUrl: '/sync' });

    fireEvent.press(screen.getByRole('button', { name: 'English' }));

    expect(screen.getByText('Offline First Sync')).toBeTruthy();
    expect(screen.getByText('Set a shared passphrase before importing or exporting.')).toBeTruthy();
    expect(screen.getByLabelText('Shared passphrase')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Export sync package' }).props.accessibilityState).toEqual({ disabled: true });
    expect(screen.getByRole('button', { name: 'Import sync package' }).props.accessibilityState).toEqual({ disabled: true });
  });
});
