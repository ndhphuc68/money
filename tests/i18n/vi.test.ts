import { vi } from '@/i18n/locales/vi';

describe('Vietnamese translations', () => {
  it('uses Vietnamese diacritics in the user-facing locale', () => {
    expect(vi.appTitle).toBe('Vimo');
    expect(vi.dashboardIncomeLabel).toBe('Thu nhập tháng này');
    expect(vi.transactionFormNameRequired).toBe('Vui lòng nhập tên giao dịch');
    expect(vi.settingsManageAccounts).toBe('Quản lý tài khoản');
    expect(vi.categoriesSave).toBe('Lưu danh mục');
  });
});
