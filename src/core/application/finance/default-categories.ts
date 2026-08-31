import { CategoryType } from '@/core/domain/finance/category';

export type DefaultCategory = {
  name: string;
  type: CategoryType;
  icon: string;
  color: string;
};

/**
 * Suggested category set offered during onboarding's "confirm default
 * categories" step, pre-configured with Vela Design icons and colors.
 */
export const DEFAULT_CATEGORIES: DefaultCategory[] = [
  { name: 'Ăn uống', type: 'expense', icon: 'mci:silverware-fork-knife', color: '#F59E0B' },
  { name: 'Di chuyển', type: 'expense', icon: 'fa6:car-side', color: '#8B5CF6' },
  { name: 'Nhà ở', type: 'expense', icon: 'fa6:house', color: '#06B6D4' },
  { name: 'Hóa đơn & tiện ích', type: 'expense', icon: 'mci:receipt-text', color: '#3B82F6' },
  { name: 'Mua sắm', type: 'expense', icon: 'fa6:bag-shopping', color: '#EC4899' },
  { name: 'Giải trí', type: 'expense', icon: 'fa6:gamepad', color: '#6366F1' },
  { name: 'Sức khỏe', type: 'expense', icon: 'fa6:heart-pulse', color: '#EF4444' },
  { name: 'Chi tiêu khác', type: 'expense', icon: 'fa6:shapes', color: '#64748B' },
  { name: 'Lương', type: 'income', icon: 'fa6:money-bill-wave', color: '#10B981' },
  { name: 'Thưởng', type: 'income', icon: 'fa6:gift', color: '#F59E0B' },
  { name: 'Thu nhập khác', type: 'income', icon: 'fa6:wallet', color: '#2F6FED' },
];
