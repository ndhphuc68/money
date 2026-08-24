import React from 'react';
import { render } from '@testing-library/react-native';
import RootScreen from '@/app/index';

describe('Expo foundation', () => {
  it('loads the default app screen', () => {
    const screen = render(React.createElement(RootScreen, {
      dependencies: {
        exportSyncPackage: {
          execute: async () => ({
            format: 'app-sync' as const,
            formatVersion: 2 as const,
            appVersion: '1.0.0',
            schemaVersion: 1,
            sourceDeviceId: '550e8400-e29b-41d4-a716-446655440000',
            exportedAt: '2026-08-24T12:00:00.000Z',
            changes: [],
            checksum: 'fnv1a-32:00000000',
          }),
        },
        importSyncPackage: { execute: async () => ({ applied: 0, skipped: 0, conflicted: 0, rejected: 0 }) },
        exportFile: async () => undefined,
        importFile: async () => null,
      },
    }));

    expect(screen.getByText('Offline First Sync')).toBeTruthy();
  });
});
