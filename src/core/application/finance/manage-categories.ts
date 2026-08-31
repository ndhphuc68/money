import {
  CategoryRepository,
  UpdateCategoryInput,
  WriteContext,
} from '@/core/application/ports/finance-repositories';
import { Category, CategoryType } from '@/core/domain/finance/category';

export type ManageCategoriesDeps = {
  categoryRepository: CategoryRepository;
  now: () => string;
  deviceId: string;
  generateId: () => string;
};

export type CreateCategoryRequest = {
  name: string;
  type: CategoryType;
  icon?: string;
  color?: string;
};

function validateCreateCategoryRequest(input: CreateCategoryRequest): void {
  if (typeof input.name !== 'string' || input.name.trim() === '') {
    throw new Error('Category name must not be empty');
  }
  if (input.type !== 'income' && input.type !== 'expense') {
    throw new Error('Category type must be income or expense');
  }
}

function writeContext(deps: ManageCategoriesDeps): WriteContext {
  return {
    originDeviceId: deps.deviceId,
    operationId: deps.generateId(),
    now: deps.now(),
  };
}

export class CreateCategory {
  constructor(private readonly deps: ManageCategoriesDeps) {}

  async execute(input: CreateCategoryRequest): Promise<Category> {
    validateCreateCategoryRequest(input);

    return this.deps.categoryRepository.create({
      id: this.deps.generateId(),
      operationId: this.deps.generateId(),
      originDeviceId: this.deps.deviceId,
      now: this.deps.now(),
      name: input.name.trim(),
      type: input.type,
      icon: input.icon,
      color: input.color,
    });
  }
}

export class UpdateCategory {
  constructor(private readonly deps: ManageCategoriesDeps) {}

  async execute(id: string, changes: UpdateCategoryInput): Promise<Category> {
    if (changes.name !== undefined && changes.name.trim() === '') {
      throw new Error('Category name must not be empty');
    }
    return this.deps.categoryRepository.update(id, changes, writeContext(this.deps));
  }
}

export class HideCategory {
  constructor(private readonly deps: ManageCategoriesDeps) {}

  execute(id: string): Promise<Category> {
    return this.deps.categoryRepository.hide(id, writeContext(this.deps));
  }
}

export class ListCategories {
  constructor(private readonly deps: Pick<ManageCategoriesDeps, 'categoryRepository'>) {}

  execute(type: CategoryType): Promise<Category[]> {
    return this.deps.categoryRepository.listActiveByType(type);
  }
}
