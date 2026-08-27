import { GoldLotRepository } from '@/core/application/ports/gold-repositories';
import { GoldLot, GoldLotInput } from '@/core/domain/gold/gold-lot';

export type CreateGoldLotDeps = {
  goldLotRepository: GoldLotRepository;
  now: () => string;
  deviceId: string;
  generateId: () => string;
};

export class CreateGoldLot {
  constructor(private readonly deps: CreateGoldLotDeps) {}

  async execute(input: GoldLotInput): Promise<GoldLot> {
    return this.deps.goldLotRepository.create({
      ...input,
      id: this.deps.generateId(),
      operationId: this.deps.generateId(),
      originDeviceId: this.deps.deviceId,
      now: this.deps.now(),
    });
  }
}
