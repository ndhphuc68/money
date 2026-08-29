import { GoldBrand, validateGoldBrandInput } from '@/core/domain/gold/gold-brand';
import { GoldLot, GoldLotStatus, validateGoldLotInput } from '@/core/domain/gold/gold-lot';
import {
  GoldSellTransaction,
  validateGoldSellTransactionInput,
} from '@/core/domain/gold/gold-sell-transaction';
import { GoldWeightUnit } from '@/core/domain/gold/gold-weight';
import { canonicalizeUuid, isIsoTimestamp, isUuid } from '@/core/domain/sync/sync-operation';
import { SyncableRecord } from '@/core/domain/sync/syncable-record';

/**
 * Pure, DB-free payload validators for the gold sync entity types. Mirrors
 * `finance-payload-validators.ts`: each validator checks the generic
 * `SyncableRecord` envelope and then the entity-specific domain shape,
 * throwing a descriptive `Error` for any violation so `SyncEngine` can
 * reject the whole package before it writes anything.
 */

const GOLD_LOT_STATUSES: readonly GoldLotStatus[] = ['held', 'sold'];
const GOLD_WEIGHT_UNITS: readonly GoldWeightUnit[] = ['luong', 'chi', 'phan', 'gram'];

function parseSyncableEnvelope(value: unknown): {
  fields: Record<string, unknown>;
  base: SyncableRecord;
} {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error('Sync operation payload must be a syncable record');
  }

  const fields = value as Record<string, unknown>;
  if (
    !isUuid(fields.id) ||
    !isUuid(fields.originDeviceId) ||
    !isIsoTimestamp(fields.createdAt) ||
    !isIsoTimestamp(fields.updatedAt) ||
    (fields.deletedAt !== null && !isIsoTimestamp(fields.deletedAt)) ||
    typeof fields.revision !== 'number' ||
    !Number.isInteger(fields.revision) ||
    fields.revision < 0
  ) {
    throw new Error('Sync operation payload contains an invalid syncable record');
  }

  return {
    fields,
    base: {
      id: canonicalizeUuid(fields.id),
      originDeviceId: canonicalizeUuid(fields.originDeviceId),
      createdAt: fields.createdAt,
      updatedAt: fields.updatedAt,
      deletedAt: fields.deletedAt as string | null,
      revision: fields.revision,
    },
  };
}

export function parseGoldBrandPayload(value: unknown): GoldBrand {
  const { fields, base } = parseSyncableEnvelope(value);

  // Reuses the domain validator rather than re-deriving the name-shape rule
  // here; it throws a descriptive Error on any violation.
  validateGoldBrandInput({ name: fields.name as string });

  return {
    ...base,
    name: fields.name as string,
  };
}

export function parseGoldLotPayload(value: unknown): GoldLot {
  const { fields, base } = parseSyncableEnvelope(value);

  // Reuses the Task 1 domain validator for the shared input shape
  // (brandId/purchaseDate/quantity/unit/totalAmount); status and
  // quantityGrams aren't part of GoldLotInput, so they're validated
  // separately below, the same way parseTransactionPayload handles
  // transfer/category branching after calling validateTransactionInput.
  validateGoldLotInput({
    brandId: fields.brandId as string,
    purchaseDate: fields.purchaseDate as string,
    quantity: fields.quantity as number,
    unit: fields.unit as GoldWeightUnit,
    totalAmount: fields.totalAmount as number,
    note: (fields.note as string | null | undefined) ?? null,
  });

  if (
    typeof fields.quantityGrams !== 'number' ||
    !Number.isFinite(fields.quantityGrams) ||
    fields.quantityGrams <= 0
  ) {
    throw new Error('Gold lot payload quantityGrams must be a positive number');
  }
  if (
    typeof fields.status !== 'string' ||
    !GOLD_LOT_STATUSES.includes(fields.status as GoldLotStatus)
  ) {
    throw new Error('Gold lot payload status is invalid');
  }
  if (fields.note !== null && typeof fields.note !== 'string') {
    throw new Error('Gold lot payload note must be a string or null');
  }
  if (!GOLD_WEIGHT_UNITS.includes(fields.unit as GoldWeightUnit)) {
    throw new Error('Gold lot payload unit is invalid');
  }

  return {
    ...base,
    brandId: fields.brandId as string,
    purchaseDate: fields.purchaseDate as string,
    quantity: fields.quantity as number,
    unit: fields.unit as GoldWeightUnit,
    quantityGrams: fields.quantityGrams as number,
    totalAmount: fields.totalAmount as number,
    note: (fields.note as string | null | undefined) ?? null,
    status: fields.status as GoldLotStatus,
  };
}

export function parseGoldSellTransactionPayload(value: unknown): GoldSellTransaction {
  const { fields, base } = parseSyncableEnvelope(value);

  // Reuses the Task 1 domain validator rather than re-deriving
  // sell-transaction-shape rules here.
  validateGoldSellTransactionInput({
    lotId: fields.lotId as string,
    saleDate: fields.saleDate as string,
    totalAmount: fields.totalAmount as number,
    note: (fields.note as string | null | undefined) ?? null,
  });

  if (fields.note !== null && typeof fields.note !== 'string') {
    throw new Error('Gold sell transaction payload note must be a string or null');
  }

  return {
    ...base,
    lotId: fields.lotId as string,
    saleDate: fields.saleDate as string,
    totalAmount: fields.totalAmount as number,
    note: (fields.note as string | null | undefined) ?? null,
  };
}
