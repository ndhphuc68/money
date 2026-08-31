import { useCallback, useEffect, useState } from 'react';

import type { CreateAccount } from '@/core/application/finance/create-account';
import type {
  CreateCategory,
  HideCategory,
  UpdateCategory,
} from '@/core/application/finance/manage-categories';
import type {
  AccountRepository,
  CategoryRepository,
  ProfileSettingsRepository,
  WriteContext,
} from '@/core/application/ports/finance-repositories';
import type { Account, AccountType } from '@/core/domain/finance/account';
import type { Category, CategoryType } from '@/core/domain/finance/category';
import type { ProfileSettings } from '@/core/domain/finance/profile-settings';
import type { Translate } from '@/i18n/translations';

export type SettingsDependencies = {
  accountRepository: AccountRepository;
  categoryRepository: CategoryRepository;
  profileSettingsRepository: ProfileSettingsRepository;
  createAccount: CreateAccount;
  createCategory: CreateCategory;
  updateCategory: UpdateCategory;
  hideCategory: HideCategory;
  buildWriteContext: () => WriteContext;
};

export type CategorySaveInput = {
  id?: string;
  name: string;
  type: CategoryType;
  icon: string;
  color: string;
};

export type SettingsViewModel = {
  loading: boolean;
  settings: ProfileSettings;
  displayName: string;
  setDisplayName(value: string): void;
  saveDisplayName(): Promise<void>;
  toggleAmountsHidden(): Promise<void>;
  accounts: Account[];
  accountName: string;
  accountType: AccountType;
  openingBalance: number | null;
  setAccountName(value: string): void;
  setAccountType(value: AccountType): void;
  setOpeningBalance(value: number | null): void;
  addAccount(): Promise<void>;
  hideAccount(id: string): Promise<void>;
  categories: Category[];
  categoryName: string;
  categoryType: CategoryType;
  categoryIcon: string;
  categoryColor: string;
  editingCategoryId: string | null;
  editingCategory: Category | null;
  setCategoryName(value: string): void;
  setCategoryType(value: CategoryType): void;
  setCategoryIcon(value: string): void;
  setCategoryColor(value: string): void;
  addCategory(): Promise<void>;
  beginEditCategory(category: Category): void;
  saveCategory(): Promise<void>;
  saveCategoryData(data: CategorySaveInput): Promise<void>;
  hideCategory(id: string): Promise<void>;
  refresh(): Promise<void>;
};

export function useSettings({
  dependencies,
  t: _t,
}: {
  dependencies: SettingsDependencies;
  t: Translate;
}): SettingsViewModel {
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<ProfileSettings>({
    displayName: '',
    amountsHidden: false,
    onboardingCompleted: false,
  });
  const [displayName, setDisplayName] = useState('');
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [accountName, setAccountName] = useState('');
  const [accountType, setAccountType] = useState<AccountType>('cash');
  const [openingBalance, setOpeningBalance] = useState<number | null>(null);
  const [categoryName, setCategoryName] = useState('');
  const [categoryType, setCategoryType] = useState<CategoryType>('expense');
  const [categoryIcon, setCategoryIcon] = useState('fa6:shapes');
  const [categoryColor, setCategoryColor] = useState('#F2734A');
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [nextSettings, nextAccounts, expense, income] = await Promise.all([
        dependencies.profileSettingsRepository.get(),
        dependencies.accountRepository.listActive(),
        dependencies.categoryRepository.listActiveByType('expense'),
        dependencies.categoryRepository.listActiveByType('income'),
      ]);
      setSettings(nextSettings);
      setDisplayName(nextSettings.displayName);
      setAccounts(nextAccounts);
      setCategories([...expense, ...income]);
    } finally {
      setLoading(false);
    }
  }, [dependencies]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const saveDisplayName = useCallback(async () => {
    const next = { ...settings, displayName: displayName.trim() };
    await dependencies.profileSettingsRepository.save(next);
    setSettings(next);
  }, [dependencies, displayName, settings]);

  const toggleAmountsHidden = useCallback(async () => {
    const next = { ...settings, amountsHidden: !settings.amountsHidden };
    await dependencies.profileSettingsRepository.save(next);
    setSettings(next);
  }, [dependencies, settings]);

  const addAccount = useCallback(async () => {
    if (!accountName.trim() || openingBalance === null) return;
    await dependencies.createAccount.execute({
      name: accountName.trim(),
      type: accountType,
      openingBalance,
    });
    setAccountName('');
    setOpeningBalance(null);
    await refresh();
  }, [accountName, accountType, dependencies, openingBalance, refresh]);

  const hideAccount = useCallback(
    async (id: string) => {
      await dependencies.accountRepository.softDeleteOrHide(id, dependencies.buildWriteContext());
      await refresh();
    },
    [dependencies, refresh],
  );

  const addCategory = useCallback(async () => {
    if (!categoryName.trim()) return;
    await dependencies.createCategory.execute({
      name: categoryName.trim(),
      type: categoryType,
      icon: categoryIcon,
      color: categoryColor,
    });
    setCategoryName('');
    setCategoryIcon('fa6:shapes');
    setCategoryColor(categoryType === 'income' ? '#10B981' : '#F2734A');
    await refresh();
  }, [categoryColor, categoryIcon, categoryName, categoryType, dependencies, refresh]);

  const beginEditCategory = useCallback((category: Category) => {
    setEditingCategoryId(category.id);
    setCategoryName(category.name);
    setCategoryType(category.type);
    setCategoryIcon(category.icon || 'fa6:shapes');
    setCategoryColor(category.color || (category.type === 'income' ? '#10B981' : '#F2734A'));
  }, []);

  const saveCategory = useCallback(async () => {
    if (!categoryName.trim()) return;
    if (editingCategoryId) {
      await dependencies.updateCategory.execute(editingCategoryId, {
        name: categoryName.trim(),
        type: categoryType,
        icon: categoryIcon,
        color: categoryColor,
      });
    } else {
      await dependencies.createCategory.execute({
        name: categoryName.trim(),
        type: categoryType,
        icon: categoryIcon,
        color: categoryColor,
      });
    }
    setEditingCategoryId(null);
    setCategoryName('');
    await refresh();
  }, [
    categoryColor,
    categoryIcon,
    categoryName,
    categoryType,
    dependencies,
    editingCategoryId,
    refresh,
  ]);

  const saveCategoryData = useCallback(
    async (data: CategorySaveInput) => {
      if (!data.name.trim()) return;
      if (data.id) {
        await dependencies.updateCategory.execute(data.id, {
          name: data.name.trim(),
          type: data.type,
          icon: data.icon,
          color: data.color,
        });
      } else {
        await dependencies.createCategory.execute({
          name: data.name.trim(),
          type: data.type,
          icon: data.icon,
          color: data.color,
        });
      }
      setEditingCategoryId(null);
      setCategoryName('');
      await refresh();
    },
    [dependencies, refresh],
  );

  const hideCategory = useCallback(
    async (id: string) => {
      await dependencies.hideCategory.execute(id);
      if (editingCategoryId === id) {
        setEditingCategoryId(null);
        setCategoryName('');
      }
      await refresh();
    },
    [dependencies, editingCategoryId, refresh],
  );

  const editingCategory = editingCategoryId
    ? (categories.find((c) => c.id === editingCategoryId) ?? null)
    : null;

  return {
    loading,
    settings,
    displayName,
    setDisplayName,
    saveDisplayName,
    toggleAmountsHidden,
    accounts,
    accountName,
    accountType,
    openingBalance,
    setAccountName,
    setAccountType,
    setOpeningBalance,
    addAccount,
    hideAccount,
    categories,
    categoryName,
    categoryType,
    categoryIcon,
    categoryColor,
    editingCategoryId,
    editingCategory,
    setCategoryName,
    setCategoryType,
    setCategoryIcon,
    setCategoryColor,
    addCategory,
    beginEditCategory,
    saveCategory,
    saveCategoryData,
    hideCategory,
    refresh,
  };
}
