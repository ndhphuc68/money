import { parseSyncOperation, SyncOperation } from '@/core/domain/sync/sync-operation';

const validOperation: SyncOperation = {
  operationId: '550e8400-e29b-41d4-a716-446655440000',
  entityType: 'note',
  entityId: '550e8400-e29b-41d4-a716-446655440001',
  operation: 'update',
  payload: { title: 'Offline note' },
  originDeviceId: '550e8400-e29b-41d4-a716-446655440002',
  revision: 2,
  createdAt: '2026-08-24T10:00:00.000Z',
};

describe('SyncOperation', () => {
  it('round-trips a valid operation through the validator', () => {
    expect(parseSyncOperation(validOperation)).toEqual(validOperation);
  });

  it.each([
    ['operationId', { operationId: '' }],
    ['entityId', { entityId: '' }],
    ['originDeviceId', { originDeviceId: '' }],
    ['revision', { revision: -1 }],
    ['createdAt', { createdAt: '' }],
    ['operationId UUID', { operationId: 'not-a-uuid' }],
  ])('rejects an invalid %s', (_, invalidFields) => {
    expect(() => parseSyncOperation({ ...validOperation, ...invalidFields })).toThrow();
  });
});
