const mockFiles = new Map<string, string>();
const mockSecureStore = new Map<string, string>();

jest.mock('expo-file-system', () => {
  class File {
    readonly uri: string;

    constructor(...parts: Array<string | { uri: string }>) {
      this.uri = parts.map((part) => (typeof part === 'string' ? part : part.uri)).join('/');
    }

    write(content: string): void {
      mockFiles.set(this.uri, content);
    }

    async text(): Promise<string> {
      const content = mockFiles.get(this.uri);
      if (content === undefined) {
        throw new Error(`No file at ${this.uri}`);
      }

      return content;
    }
  }

  return { File, Paths: { document: 'memory://documents' } };
});

jest.mock('expo-document-picker', () => ({ getDocumentAsync: jest.fn() }));
jest.mock('expo-sharing', () => ({ isAvailableAsync: jest.fn(), shareAsync: jest.fn() }));
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async (key: string) => mockSecureStore.get(key) ?? null),
  setItemAsync: jest.fn(async (key: string, value: string) => {
    mockSecureStore.set(key, value);
  }),
}));
jest.mock('expo-crypto', () => ({ randomUUID: jest.fn() }));

import * as DocumentPicker from 'expo-document-picker';
import * as Sharing from 'expo-sharing';
import * as SecureStore from 'expo-secure-store';
import { randomUUID } from 'expo-crypto';

import { ImportSummary, SyncTransport } from '@/core/application/ports/sync-transport';
import { SyncPackage } from '@/core/domain/sync/sync-package';
import { StableSyncPackageSerializer } from '@/data/sync/serializers/sync-package-serializer';
import { FileSyncTransport } from '@/data/sync/transports/file-sync-transport';
import { DeviceIdentity } from '@/infrastructure/expo/device-identity/device-identity';
import { SyncPackageFile } from '@/infrastructure/expo/file-system/sync-package-file';
import { SystemFilePicker } from '@/infrastructure/expo/file-system/system-file-picker';
import { SecureStorage } from '@/infrastructure/expo/secure-store/secure-storage';
import { SystemShare } from '@/infrastructure/expo/sharing/system-share';

const serializer = new StableSyncPackageSerializer();
const packageFixture: SyncPackage = serializer.withChecksum({
  format: 'app-sync',
  formatVersion: 1,
  appVersion: '1.0.0',
  schemaVersion: 1,
  sourceDeviceId: '550e8400-e29b-41d4-a716-446655440000',
  exportedAt: '2026-08-24T12:00:00.000Z',
  changes: [],
});

beforeEach(() => {
  mockFiles.clear();
  mockSecureStore.clear();
  jest.clearAllMocks();
});

describe('SyncPackageFile', () => {
  it('writes a versioned package and preserves its checksum when read back', async () => {
    const files = new SyncPackageFile(serializer, () => 'export.app-sync.json');

    const uri = await files.write(packageFixture);

    expect(uri).toBe('memory://documents/export.app-sync.json');
    expect(JSON.parse(mockFiles.get(uri) ?? '')).toMatchObject({ checksum: packageFixture.checksum, formatVersion: 1 });
    await expect(files.read(uri)).resolves.toEqual(packageFixture);
  });

  it.each(['not json', JSON.stringify({ format: 'not-sync' })])('rejects malformed package content: %s', async (content) => {
    const files = new SyncPackageFile(serializer);
    const uri = 'memory://documents/malformed.app-sync.json';
    mockFiles.set(uri, content);

    await expect(files.read(uri)).rejects.toThrow();
  });
});

describe('FileSyncTransport', () => {
  it('writes the engine export without changing its checksum', async () => {
    const engine: SyncTransport = {
      exportChanges: async () => packageFixture,
      importChanges: async () => emptySummary(),
    };
    const files = new SyncPackageFile(serializer, () => 'transport.app-sync.json');
    const transport = new FileSyncTransport(engine, files);

    const uri = await transport.exportToFile();

    expect(await files.read(uri)).toEqual(packageFixture);
  });

  it('passes an imported package directly to the sync engine for validation and merging', async () => {
    const files = new SyncPackageFile(serializer);
    const uri = 'memory://documents/import.app-sync.json';
    mockFiles.set(uri, serializer.serialize(packageFixture));
    const summary: ImportSummary = { applied: 2, skipped: 1, conflicted: 0, rejected: 0 };
    const engine: SyncTransport = {
      exportChanges: async () => packageFixture,
      importChanges: jest.fn(async () => summary),
    };
    const transport = new FileSyncTransport(engine, files);

    await expect(transport.importFromFile(uri)).resolves.toEqual(summary);
    expect(engine.importChanges).toHaveBeenCalledWith(packageFixture);
  });
});

describe('system Expo adapters', () => {
  it('shares sync files through the system sharing sheet', async () => {
    jest.mocked(Sharing.isAvailableAsync).mockResolvedValue(true);
    const share = new SystemShare();

    await share.shareFile('file:///sync.app-sync.json');

    expect(Sharing.shareAsync).toHaveBeenCalledWith('file:///sync.app-sync.json', {
      mimeType: 'application/json',
      UTI: 'public.json',
    });
  });

  it('rejects sharing when the system sharing sheet is unavailable', async () => {
    jest.mocked(Sharing.isAvailableAsync).mockResolvedValue(false);

    await expect(new SystemShare().shareFile('file:///sync.app-sync.json')).rejects.toThrow('System sharing is unavailable');
  });

  it('returns the selected sync package URI and null after picker cancellation', async () => {
    jest.mocked(DocumentPicker.getDocumentAsync)
      .mockResolvedValueOnce({
        canceled: false,
        assets: [{ name: 'sync.app-sync.json', uri: 'file:///picked.app-sync.json', lastModified: 0 }],
      })
      .mockResolvedValueOnce({ canceled: true, assets: null });
    const picker = new SystemFilePicker();

    await expect(picker.pickSyncPackage()).resolves.toBe('file:///picked.app-sync.json');
    await expect(picker.pickSyncPackage()).resolves.toBeNull();
  });

  it('stores a generated device identity and reuses it after a restart', async () => {
    jest.mocked(randomUUID).mockReturnValue('550e8400-e29b-41d4-a716-446655440099');
    const storage = new SecureStorage();

    const firstIdentity = new DeviceIdentity(storage);
    const secondIdentity = new DeviceIdentity(storage);

    await expect(firstIdentity.get()).resolves.toBe('550e8400-e29b-41d4-a716-446655440099');
    await expect(secondIdentity.get()).resolves.toBe('550e8400-e29b-41d4-a716-446655440099');
    expect(SecureStore.setItemAsync).toHaveBeenCalledTimes(1);
  });
});

function emptySummary(): ImportSummary {
  return { applied: 0, skipped: 0, conflicted: 0, rejected: 0 };
}
