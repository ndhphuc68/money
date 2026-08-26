import { fireEvent, render } from '@testing-library/react-native';

import {
  AccountPicker,
  AmountInput,
  CategoryPicker,
  DateField,
  FilterBar,
  TransactionForm,
  UndoBanner,
} from '@/components/finance';
import type { Account } from '@/core/domain/finance/account';
import type { Category } from '@/core/domain/finance/category';
import { translate } from '@/i18n/translations';

const t = translate.bind(null, 'vi');
const filterLabels = {
  account: t('filterAccount'), all: t('filterAll'), category: t('filterCategory'), expense: t('filterExpense'),
  income: t('filterIncome'), month: t('filterMonth'), nextMonth: t('filterNextMonth'), previousMonth: t('filterPreviousMonth'),
  searchLabel: t('filterSearchLabel'), searchPlaceholder: t('filterSearchPlaceholder'), transfer: t('filterTransfer'),
};

function makeAccount(overrides: Partial<Account>): Account {
  return {
    id: 'acc-1',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    deletedAt: null,
    revision: 1,
    originDeviceId: 'device-1',
    name: 'Vi tien mat',
    type: 'cash',
    openingBalance: 0,
    isArchived: false,
    ...overrides,
  };
}

function makeCategory(overrides: Partial<Category>): Category {
  return {
    id: 'cat-1',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    deletedAt: null,
    revision: 1,
    originDeviceId: 'device-1',
    name: 'An uong',
    type: 'expense',
    isArchived: false,
    ...overrides,
  };
}

function todayIso(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatDmy(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

const accounts: Account[] = [
  makeAccount({ id: 'acc-cash', name: 'Vi tien mat' }),
  makeAccount({ id: 'acc-bank', name: 'Ngan hang ACB', type: 'bank' }),
];

const categories: Category[] = [
  makeCategory({ id: 'cat-food', name: 'An uong', type: 'expense' }),
  makeCategory({ id: 'cat-salary', name: 'Luong', type: 'income' }),
];

describe('AmountInput', () => {
  it('formats VND with thousands separators while typing', () => {
    const onChange = jest.fn();
    const screen = render(<AmountInput invalidMessage={t('amountInvalid')} label={t('transactionFormAmountLabel')} onChange={onChange} placeholder={t('amountPlaceholder')} value={null} />);
    const input = screen.getByLabelText('Số tiền');

    fireEvent.changeText(input, '1000000');

    expect(input.props.value).toBe('1.000.000');
    expect(onChange).toHaveBeenLastCalledWith(1000000);
  });

  it('parses formatted VND text into a positive integer and flags invalid input', () => {
    const onChange = jest.fn();
    const screen = render(<AmountInput invalidMessage={t('amountInvalid')} label={t('transactionFormAmountLabel')} onChange={onChange} placeholder={t('amountPlaceholder')} value={null} />);
    const input = screen.getByLabelText('Số tiền');

    fireEvent.changeText(input, '1.000.000');
    expect(onChange).toHaveBeenLastCalledWith(1000000);

    fireEvent.changeText(input, 'abc');
    expect(onChange).toHaveBeenLastCalledWith(null);
    expect(screen.getByText('Số tiền không hợp lệ')).toBeTruthy();

    fireEvent.changeText(input, '0');
    expect(onChange).toHaveBeenLastCalledWith(null);
    expect(screen.getByText('Số tiền không hợp lệ')).toBeTruthy();
  });
});

describe('AccountPicker', () => {
  it('lists accounts with accessible labels and reports selection', () => {
    const onSelect = jest.fn();
    const screen = render(
      <AccountPicker accounts={accounts} label="Tài khoản" onSelect={onSelect} selectedId="acc-cash" />,
    );

    expect(screen.getByRole('button', { name: 'Vi tien mat' }).props.accessibilityState).toEqual({ selected: true });
    fireEvent.press(screen.getByRole('button', { name: 'Ngan hang ACB' }));
    expect(onSelect).toHaveBeenCalledWith('acc-bank');
  });

  it('shows an "all" chip and reports null selection when allowUnselect is set', () => {
    const onSelect = jest.fn();
    const screen = render(
      <AccountPicker allLabel={t('filterAll')} accounts={accounts} allowUnselect onSelect={onSelect} selectedId={null} />,
    );

    fireEvent.press(screen.getByRole('button', { name: 'Tất cả' }));
    expect(onSelect).toHaveBeenCalledWith(null);
  });
});

describe('CategoryPicker', () => {
  it('only lists categories matching the given type', () => {
    const onSelect = jest.fn();
    const screen = render(
      <CategoryPicker categories={categories} onSelect={onSelect} selectedId={null} type="expense" />,
    );

    expect(screen.getByRole('button', { name: 'An uong' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Luong' })).toBeNull();

    fireEvent.press(screen.getByRole('button', { name: 'An uong' }));
    expect(onSelect).toHaveBeenCalledWith('cat-food');
  });
});

describe('DateField', () => {
  it('defaults to displaying the given date and exposes an accessible label', () => {
    const iso = todayIso();
    const screen = render(<DateField label={t('dateTransactionLabel')} onChange={jest.fn()} value={iso} />);

    expect(screen.getByText(formatDmy(iso))).toBeTruthy();
    expect(screen.getByRole('button', { name: `Ngày giao dịch: ${formatDmy(iso)}` })).toBeTruthy();
  });
});

describe('TransactionForm', () => {
  function renderForm(onSubmit = jest.fn()) {
    const screen = render(
      <TransactionForm accounts={accounts} categories={categories} onSubmit={onSubmit} t={t} />,
    );
    return { screen, onSubmit };
  }

  it('shows category for income/expense and destination account only for transfer', () => {
    const { screen } = renderForm();

    expect(screen.getByText('Danh mục')).toBeTruthy();
    expect(screen.queryByText('Tài khoản đích')).toBeNull();

    fireEvent.press(screen.getByRole('button', { name: 'Chuyển khoản' }));

    expect(screen.queryByText('Danh mục')).toBeNull();
    expect(screen.getByText('Tài khoản đích')).toBeTruthy();
  });

  it('requires a name before submitting', () => {
    const { screen, onSubmit } = renderForm();

    fireEvent.press(screen.getByRole('button', { name: 'Lưu giao dịch' }));

    expect(screen.getByText('Vui lòng nhập tên giao dịch')).toBeTruthy();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('requires an amount before submitting', () => {
    const { screen, onSubmit } = renderForm();

    fireEvent.changeText(screen.getByLabelText('Tên giao dịch'), 'Ăn trưa');
    fireEvent.press(screen.getByRole('button', { name: 'Lưu giao dịch' }));

    expect(screen.getByText('Số tiền không hợp lệ')).toBeTruthy();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('shows a single error line for a non-empty invalid amount, not a duplicate', () => {
    const { screen, onSubmit } = renderForm();

    fireEvent.changeText(screen.getByLabelText('Tên giao dịch'), 'Ăn trưa');
    fireEvent.changeText(screen.getByLabelText('Số tiền'), 'abc');
    fireEvent.press(screen.getByRole('button', { name: 'Vi tien mat' }));
    fireEvent.press(screen.getByRole('button', { name: 'An uong' }));
    fireEvent.press(screen.getByRole('button', { name: 'Lưu giao dịch' }));

    expect(screen.getAllByText('Số tiền không hợp lệ')).toHaveLength(1);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('requires a category for income/expense transactions', () => {
    const { screen, onSubmit } = renderForm();

    fireEvent.changeText(screen.getByLabelText('Tên giao dịch'), 'Ăn trưa');
    fireEvent.changeText(screen.getByLabelText('Số tiền'), '50000');
    fireEvent.press(screen.getByRole('button', { name: 'Vi tien mat' }));
    fireEvent.press(screen.getByRole('button', { name: 'Lưu giao dịch' }));

    expect(screen.getByText('Vui lòng chọn danh mục')).toBeTruthy();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('rejects a transfer whose destination matches the source account', () => {
    const { screen, onSubmit } = renderForm();

    fireEvent.press(screen.getByRole('button', { name: 'Chuyển khoản' }));
    fireEvent.changeText(screen.getByLabelText('Tên giao dịch'), 'Chuyển tiền');
    fireEvent.changeText(screen.getByLabelText('Số tiền'), '50000');

    const sourceButtons = screen.getAllByRole('button', { name: 'Vi tien mat' });
    fireEvent.press(sourceButtons[0]);
    const destButtons = screen.getAllByRole('button', { name: 'Vi tien mat' });
    fireEvent.press(destButtons[destButtons.length - 1]);

    fireEvent.press(screen.getByRole('button', { name: 'Lưu giao dịch' }));

    expect(screen.getByText('Tài khoản đích phải khác tài khoản nguồn')).toBeTruthy();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('defaults the date field to today', () => {
    const { screen } = renderForm();
    const iso = todayIso();

    expect(screen.getByText(formatDmy(iso))).toBeTruthy();
  });

  it('submits a valid income/expense transaction', () => {
    const { screen, onSubmit } = renderForm();

    fireEvent.changeText(screen.getByLabelText('Tên giao dịch'), 'Ăn trưa');
    fireEvent.changeText(screen.getByLabelText('Số tiền'), '50000');
    fireEvent.press(screen.getByRole('button', { name: 'Vi tien mat' }));
    fireEvent.press(screen.getByRole('button', { name: 'An uong' }));
    fireEvent.press(screen.getByRole('button', { name: 'Lưu giao dịch' }));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'expense',
        name: 'Ăn trưa',
        amount: 50000,
        accountId: 'acc-cash',
        categoryId: 'cat-food',
        date: todayIso(),
      }),
    );
  });
});

describe('FilterBar', () => {
  it('reports month navigation, type, category, account and search changes', () => {
    const onMonthChange = jest.fn();
    const onTypeChange = jest.fn();
    const onCategoryChange = jest.fn();
    const onAccountChange = jest.fn();
    const onSearchChange = jest.fn();

    const screen = render(
      <FilterBar
        accountId={null}
        accounts={accounts}
        categories={categories}
        categoryId={null}
        month="2026-08"
        onAccountChange={onAccountChange}
        onCategoryChange={onCategoryChange}
        onMonthChange={onMonthChange}
        onSearchChange={onSearchChange}
        onTypeChange={onTypeChange}
        search=""
        type="all"
        labels={filterLabels}
      />,
    );

    fireEvent.press(screen.getByRole('button', { name: 'Tháng sau' }));
    expect(onMonthChange).toHaveBeenCalledWith('2026-09');

    fireEvent.press(screen.getByRole('button', { name: 'Thu nhập' }));
    expect(onTypeChange).toHaveBeenCalledWith('income');

    fireEvent.press(screen.getByRole('button', { name: 'An uong' }));
    expect(onCategoryChange).toHaveBeenCalledWith('cat-food');

    fireEvent.press(screen.getByRole('button', { name: 'Ngan hang ACB' }));
    expect(onAccountChange).toHaveBeenCalledWith('acc-bank');

    fireEvent.changeText(screen.getByLabelText('Tìm kiếm giao dịch'), 'cà phê');
    expect(onSearchChange).toHaveBeenCalledWith('cà phê');
  });

  it('shows both income and expense categories in the default "all" type view', () => {
    const screen = render(
      <FilterBar
        accountId={null}
        accounts={accounts}
        categories={categories}
        categoryId={null}
        month="2026-08"
        onAccountChange={jest.fn()}
        onCategoryChange={jest.fn()}
        onMonthChange={jest.fn()}
        onSearchChange={jest.fn()}
        onTypeChange={jest.fn()}
        search=""
        type="all"
        labels={filterLabels}
      />,
    );

    expect(screen.getByRole('button', { name: 'An uong' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Luong' })).toBeTruthy();
  });
});

describe('UndoBanner', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('calls restore once when pressed and stops accepting further presses', () => {
    const onUndo = jest.fn();
    const screen = render(<UndoBanner durationMs={5000} message={t('transactionsDeleteUndoMessage')} onUndo={onUndo} undoLabel={t('undoAction')} />);

    expect(screen.getByText('Đã xóa giao dịch')).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Hoàn tác' }));
    fireEvent.press(screen.getByRole('button', { name: 'Hoàn tác' }));

    expect(onUndo).toHaveBeenCalledTimes(1);
  });

  it('expires after the configured window and calls onExpire', () => {
    const onUndo = jest.fn();
    const onExpire = jest.fn();
    render(<UndoBanner durationMs={2000} message={t('transactionsDeleteUndoMessage')} onExpire={onExpire} onUndo={onUndo} undoLabel={t('undoAction')} />);

    jest.advanceTimersByTime(2000);

    expect(onExpire).toHaveBeenCalledTimes(1);
    expect(onUndo).not.toHaveBeenCalled();
  });
});
