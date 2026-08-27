import { SyncableRecord } from '../sync/syncable-record';

export type GoldBrand = SyncableRecord & {
  name: string;
};

export type GoldBrandInput = {
  name: string;
};

export function validateGoldBrandInput(input: GoldBrandInput): void {
  if (typeof input.name !== 'string' || input.name.trim() === '') {
    throw new Error('Gold brand name must not be empty');
  }
}
