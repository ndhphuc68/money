import { GoldBrandRepository } from '@/core/application/ports/gold-repositories';
import { GoldBrand, GoldBrandInput } from '@/core/domain/gold/gold-brand';

export type GoldBrandUseCaseDeps = {
  goldBrandRepository: GoldBrandRepository;
  now: () => string;
  deviceId: string;
  generateId: () => string;
};

export class CreateGoldBrand {
  constructor(private readonly deps: GoldBrandUseCaseDeps) {}

  async execute(input: GoldBrandInput): Promise<GoldBrand> {
    return this.deps.goldBrandRepository.create({
      ...input,
      id: this.deps.generateId(),
      operationId: this.deps.generateId(),
      originDeviceId: this.deps.deviceId,
      now: this.deps.now(),
    });
  }
}

export class ListGoldBrands {
  constructor(private readonly deps: Pick<GoldBrandUseCaseDeps, 'goldBrandRepository'>) {}

  async execute(): Promise<GoldBrand[]> {
    return this.deps.goldBrandRepository.listActive();
  }
}

export class DeleteGoldBrand {
  constructor(private readonly deps: GoldBrandUseCaseDeps) {}

  /** Removes a brand from the selectable catalog. Never touches lots that reference it (spec §Quản lý thương hiệu). */
  async execute(id: string): Promise<GoldBrand> {
    return this.deps.goldBrandRepository.softDelete(id, {
      originDeviceId: this.deps.deviceId,
      operationId: this.deps.generateId(),
      now: this.deps.now(),
    });
  }
}
