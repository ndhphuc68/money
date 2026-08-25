import { CategoryType } from '@/core/domain/finance/category';

export type DefaultCategory = {
  name: string;
  type: CategoryType;
};

/**
 * Suggested category set offered during onboarding's "confirm default
 * categories" step. Plain data only: `Category` (Task 1) has no icon/color
 * fields, so this list is deliberately just name + type. The user can
 * accept, edit, or drop any of these before `Onboarding.confirmDefaults`
 * creates them.
 */
export const DEFAULT_CATEGORIES: DefaultCategory[] = [
  { name: 'Lương', type: 'income' },
  { name: 'Thưởng', type: 'income' },
  { name: 'Thu nhập khác', type: 'income' },
  { name: 'Ăn uống', type: 'expense' },
  { name: 'Di chuyển', type: 'expense' },
  { name: 'Nhà ở', type: 'expense' },
  { name: 'Hóa đơn & tiện ích', type: 'expense' },
  { name: 'Mua sắm', type: 'expense' },
  { name: 'Giải trí', type: 'expense' },
  { name: 'Sức khỏe', type: 'expense' },
  { name: 'Chi tiêu khác', type: 'expense' },
];
