import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';

import RootScreen from '@/app/index';

describe('root navigation', () => {
  it('renders the sync home route with import and export actions', () => {
    const screen = render(React.createElement(RootScreen, { dependencies: createDependencies() }));

    expect(screen.getByText('Offline First Sync')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Export sync package' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Import sync package' })).toBeTruthy();
  });

  it('shows the export result after the sync view model completes', async () => {
    const screen = render(React.createElement(RootScreen, { dependencies: createDependencies() }));

    fireEvent.press(screen.getByRole('button', { name: 'Export sync package' }));

    await waitFor(() => expect(screen.getByText('Sync package exported.')).toBeTruthy());
  });

  it('shows the import summary after the sync view model completes', async () => {
    const screen = render(React.createElement(RootScreen, { dependencies: createDependencies() }));

    fireEvent.press(screen.getByRole('button', { name: 'Import sync package' }));

    await waitFor(() => expect(screen.getByText('Import complete: 2 applied, 1 skipped, 0 conflicted, 0 rejected.')).toBeTruthy());
  });

  it('shows an action error instead of leaving a failed sync invisible', async () => {
    const screen = render(React.createElement(RootScreen, {
      dependencies: createDependencies({ exportError: new Error('System sharing is unavailable') }),
    }));

    fireEvent.press(screen.getByRole('button', { name: 'Export sync package' }));

    await waitFor(() => expect(screen.getByText('System sharing is unavailable')).toBeTruthy());
  });
});

function createDependencies(options: { exportError?: Error } = {}) {
  return {
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
    importSyncPackage: {
      execute: async () => ({ applied: 2, skipped: 1, conflicted: 0, rejected: 0 }),
    },
    exportFile: async () => {
      if (options.exportError !== undefined) {
        throw options.exportError;
      }
    },
    importFile: async () => ({
      format: 'app-sync' as const,
      formatVersion: 2 as const,
      appVersion: '1.0.0',
      schemaVersion: 1,
      sourceDeviceId: '550e8400-e29b-41d4-a716-446655440001',
      exportedAt: '2026-08-24T12:00:00.000Z',
      changes: [],
      checksum: 'fnv1a-32:00000000',
    }),
  };
}
