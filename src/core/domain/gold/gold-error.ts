export type GoldErrorCode =
  | 'lotHasActiveSale'
  | 'lotNotFound'
  | 'lotNotAvailableToSell'
  | 'saleDateBeforePurchase'
  | 'lotNoLongerAvailable';

export class GoldError extends Error {
  constructor(
    public readonly code: GoldErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'GoldError';
  }
}
