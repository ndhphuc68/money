import { WriteContext } from '@/core/application/ports/finance-repositories';
import { GoldBrand, GoldBrandInput } from '@/core/domain/gold/gold-brand';
import { GoldLot, GoldLotInput, GoldLotStatus } from '@/core/domain/gold/gold-lot';
import {
  GoldSellTransaction,
  GoldSellTransactionInput,
} from '@/core/domain/gold/gold-sell-transaction';
import { SyncOperation } from '@/core/domain/sync/sync-operation';

export type CreateGoldLotInput = WriteContext & GoldLotInput & { id: string };

export type GoldLotListFilter = {
  /** When true, includes soft-deleted (trashed) lots. Defaults to false. */
  includeDeleted?: boolean;
  status?: GoldLotStatus;
};

export interface GoldLotRepository {
  create(input: CreateGoldLotInput): Promise<GoldLot>;
  softDelete(id: string, context: WriteContext): Promise<GoldLot>;
  restore(id: string, context: WriteContext): Promise<GoldLot>;
  findById(id: string): Promise<GoldLot | null>;
  list(filter?: GoldLotListFilter): Promise<GoldLot[]>;
  /** Flips status to 'sold'. Called by SellGoldLot inside its own transaction — does not append a change-log entry itself. */
  markSold(id: string, context: WriteContext): Promise<GoldLot>;
  /** Flips status back to 'held'. Called by TrashGoldTransaction/RestoreGoldTransaction. */
  markHeld(id: string, context: WriteContext): Promise<GoldLot>;
  saveWithOperation(record: GoldLot, operation: SyncOperation): Promise<void>;
}

export type CreateGoldSellTransactionInput = WriteContext &
  GoldSellTransactionInput & { id: string };

export type GoldSellTransactionListFilter = {
  includeDeleted?: boolean;
};

export interface GoldSellTransactionRepository {
  create(input: CreateGoldSellTransactionInput): Promise<GoldSellTransaction>;
  softDelete(id: string, context: WriteContext): Promise<GoldSellTransaction>;
  restore(id: string, context: WriteContext): Promise<GoldSellTransaction>;
  findById(id: string): Promise<GoldSellTransaction | null>;
  /** Finds the single active (non-trashed) sell transaction for a lot, if any. */
  findActiveByLotId(lotId: string): Promise<GoldSellTransaction | null>;
  list(filter?: GoldSellTransactionListFilter): Promise<GoldSellTransaction[]>;
  saveWithOperation(record: GoldSellTransaction, operation: SyncOperation): Promise<void>;
}

export type CreateGoldBrandInput = WriteContext & GoldBrandInput & { id: string };

export interface GoldBrandRepository {
  create(input: CreateGoldBrandInput): Promise<GoldBrand>;
  softDelete(id: string, context: WriteContext): Promise<GoldBrand>;
  findById(id: string): Promise<GoldBrand | null>;
  listActive(): Promise<GoldBrand[]>;
  saveWithOperation(record: GoldBrand, operation: SyncOperation): Promise<void>;
}
