import { fireEvent, render } from '@testing-library/react-native';

import type { Category } from '@/core/domain/finance/category';
import { CategoriesScreen } from '@/features/finance/screens/categories-screen';
import type { SettingsViewModel } from '@/features/finance/view-models/use-settings';
import { translate } from '@/i18n/translations';

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

const t = translate.bind(null, 'vi');

describe('CategoriesScreen', () => {
  const sampleCategories: Category[] = [
    {
      id: 'cat-1',
      name: 'Ăn uống',
      type: 'expense',
      icon: 'mci:silverware-fork-knife',
      color: '#F59E0B',
      isArchived: false,
      createdAt: '2026-08-24T10:00:00.000Z',
      updatedAt: '2026-08-24T10:00:00.000Z',
      deletedAt: null,
      revision: 1,
      originDeviceId: 'dev-1',
    },
    {
      id: 'cat-2',
      name: 'Lương',
      type: 'income',
      icon: 'fa6:money-bill-wave',
      color: '#10B981',
      isArchived: false,
      createdAt: '2026-08-24T10:00:00.000Z',
      updatedAt: '2026-08-24T10:00:00.000Z',
      deletedAt: null,
      revision: 1,
      originDeviceId: 'dev-1',
    },
  ];

  const createMockViewModel = (overrides: Partial<SettingsViewModel> = {}): SettingsViewModel => ({
    loading: false,
    settings: { displayName: '', amountsHidden: false, onboardingCompleted: true },
    displayName: '',
    setDisplayName: jest.fn(),
    saveDisplayName: jest.fn(),
    toggleAmountsHidden: jest.fn(),
    accounts: [],
    accountName: '',
    accountType: 'cash',
    openingBalance: null,
    setAccountName: jest.fn(),
    setAccountType: jest.fn(),
    setOpeningBalance: jest.fn(),
    addAccount: jest.fn(),
    hideAccount: jest.fn(),
    categories: sampleCategories,
    categoryName: '',
    categoryType: 'expense',
    categoryIcon: 'fa6:shapes',
    categoryColor: '#F2734A',
    editingCategoryId: null,
    editingCategory: null,
    setCategoryName: jest.fn(),
    setCategoryType: jest.fn(),
    setCategoryIcon: jest.fn(),
    setCategoryColor: jest.fn(),
    addCategory: jest.fn(),
    beginEditCategory: jest.fn(),
    saveCategory: jest.fn(),
    saveCategoryData: jest.fn(),
    hideCategory: jest.fn(),
    refresh: jest.fn(),
    ...overrides,
  });

  it('renders category list filtered by the active tab (default: Chi tiêu)', () => {
    const onBack = jest.fn();
    const vm = createMockViewModel();
    const screen = render(<CategoriesScreen {...vm} onBack={onBack} t={t} />);

    expect(screen.getByText('Ăn uống')).toBeTruthy();
    expect(screen.queryByText('Lương')).toBeNull();
  });

  it('switches to Thu nhập tab and shows income categories', () => {
    const onBack = jest.fn();
    const vm = createMockViewModel();
    const screen = render(<CategoriesScreen {...vm} onBack={onBack} t={t} />);

    // Switch tab to "Thu nhập"
    fireEvent.press(screen.getByText('Thu nhập'));

    expect(screen.getByText('Lương')).toBeTruthy();
    expect(screen.queryByText('Ăn uống')).toBeNull();
  });

  it('calls onBack when back button is pressed', () => {
    const onBack = jest.fn();
    const vm = createMockViewModel();
    const screen = render(<CategoriesScreen {...vm} onBack={onBack} t={t} />);

    fireEvent.press(screen.getByLabelText(t('settingsBack')));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('opens add category form sheet when + Thêm mới button is pressed', () => {
    const onBack = jest.fn();
    const vm = createMockViewModel();
    const screen = render(<CategoriesScreen {...vm} onBack={onBack} t={t} />);

    fireEvent.press(screen.getByLabelText(t('categoriesAdd')));
    expect(screen.getByText('Thêm danh mục mới')).toBeTruthy();
  });
});
