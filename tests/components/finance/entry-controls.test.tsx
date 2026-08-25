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
  it('parses formatted VND text into a positive integer and flags invalid input', () => {
    const onChange = jest.fn();
    const screen = render(<AmountInput onChange={onChange} value={null} />);
    const input = screen.getByLabelText('So tien');

    fireEvent.changeText(input, '1.000.000');
    expect(onChange).toHaveBeenLastCalledWith(1000000);

    fireEvent.changeText(input, 'abc');
    expect(onChange).toHaveBeenLastCalledWith(null);
    expect(screen.getByText('So tien khong hop le')).toBeTruthy();

    fireEvent.changeText(input, '0');
    expect(onChange).toHaveBeenLastCalledWith(null);
    expect(screen.getByText('So tien khong hop le')).toBeTruthy();
  });
});

describe('AccountPicker', () => {
  it('lists accounts with accessible labels and reports selection', () => {
    const onSelect = jest.fn();
    const screen = render(
      <AccountPicker accounts={accounts} label="Tai khoan" onSelect={onSelect} selectedId="acc-cash" />,
    );

    expect(screen.getByRole('button', { name: 'Vi tien mat' }).props.accessibilityState).toEqual({ selected: true });
    fireEvent.press(screen.getByRole('button', { name: 'Ngan hang ACB' }));
    expect(onSelect).toHaveBeenCalledWith('acc-bank');
  });

  it('shows an "all" chip and reports null selection when allowUnselect is set', () => {
    const onSelect = jest.fn();
    const screen = render(
      <AccountPicker accounts={accounts} allowUnselect onSelect={onSelect} selectedId={null} />,
    );

    fireEvent.press(screen.getByRole('button', { name: 'Tat ca' }));
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
    const screen = render(<DateField onChange={jest.fn()} value={iso} />);

    expect(screen.getByText(formatDmy(iso))).toBeTruthy();
    expect(screen.getByRole('button', { name: `Ngay giao dich: ${formatDmy(iso)}` })).toBeTruthy();
  });
});

describe('TransactionForm', () => {
  function renderForm(onSubmit = jest.fn()) {
    const screen = render(
      <TransactionForm accounts={accounts} categories={categories} onSubmit={onSubmit} />,
    );
    return { screen, onSubmit };
  }

  it('shows category for income/expense and destination account only for transfer', () => {
    const { screen } = renderForm();

    expect(screen.getByText('Danh muc')).toBeTruthy();
    expect(screen.queryByText('Tai khoan dich')).toBeNull();

    fireEvent.press(screen.getByRole('button', { name: 'Chuyen khoan' }));

    expect(screen.queryByText('Danh muc')).toBeNull();
    expect(screen.getByText('Tai khoan dich')).toBeTruthy();
  });

  it('requires a name before submitting', () => {
    const { screen, onSubmit } = renderForm();

    fireEvent.press(screen.getByRole('button', { name: 'Luu giao dich' }));

    expect(screen.getByText('Vui long nhap ten giao dich')).toBeTruthy();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('requires an amount before submitting', () => {
    const { screen, onSubmit } = renderForm();

    fireEvent.changeText(screen.getByLabelText('Ten giao dich'), 'An trua');
    fireEvent.press(screen.getByRole('button', { name: 'Luu giao dich' }));

    expect(screen.getByText('So tien khong hop le')).toBeTruthy();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('shows a single error line for a non-empty invalid amount, not a duplicate', () => {
    const { screen, onSubmit } = renderForm();

    fireEvent.changeText(screen.getByLabelText('Ten giao dich'), 'An trua');
    fireEvent.changeText(screen.getByLabelText('So tien'), 'abc');
    fireEvent.press(screen.getByRole('button', { name: 'Vi tien mat' }));
    fireEvent.press(screen.getByRole('button', { name: 'An uong' }));
    fireEvent.press(screen.getByRole('button', { name: 'Luu giao dich' }));

    expect(screen.getAllByText('So tien khong hop le')).toHaveLength(1);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('requires a category for income/expense transactions', () => {
    const { screen, onSubmit } = renderForm();

    fireEvent.changeText(screen.getByLabelText('Ten giao dich'), 'An trua');
    fireEvent.changeText(screen.getByLabelText('So tien'), '50000');
    fireEvent.press(screen.getByRole('button', { name: 'Vi tien mat' }));
    fireEvent.press(screen.getByRole('button', { name: 'Luu giao dich' }));

    expect(screen.getByText('Vui long chon danh muc')).toBeTruthy();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('rejects a transfer whose destination matches the source account', () => {
    const { screen, onSubmit } = renderForm();

    fireEvent.press(screen.getByRole('button', { name: 'Chuyen khoan' }));
    fireEvent.changeText(screen.getByLabelText('Ten giao dich'), 'Chuyen tien');
    fireEvent.changeText(screen.getByLabelText('So tien'), '50000');

    const sourceButtons = screen.getAllByRole('button', { name: 'Vi tien mat' });
    fireEvent.press(sourceButtons[0]);
    const destButtons = screen.getAllByRole('button', { name: 'Vi tien mat' });
    fireEvent.press(destButtons[destButtons.length - 1]);

    fireEvent.press(screen.getByRole('button', { name: 'Luu giao dich' }));

    expect(screen.getByText('Tai khoan dich phai khac tai khoan nguon')).toBeTruthy();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('defaults the date field to today', () => {
    const { screen } = renderForm();
    const iso = todayIso();

    expect(screen.getByText(formatDmy(iso))).toBeTruthy();
  });

  it('submits a valid income/expense transaction', () => {
    const { screen, onSubmit } = renderForm();

    fireEvent.changeText(screen.getByLabelText('Ten giao dich'), 'An trua');
    fireEvent.changeText(screen.getByLabelText('So tien'), '50000');
    fireEvent.press(screen.getByRole('button', { name: 'Vi tien mat' }));
    fireEvent.press(screen.getByRole('button', { name: 'An uong' }));
    fireEvent.press(screen.getByRole('button', { name: 'Luu giao dich' }));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'expense',
        name: 'An trua',
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
      />,
    );

    fireEvent.press(screen.getByRole('button', { name: 'Thang sau' }));
    expect(onMonthChange).toHaveBeenCalledWith('2026-09');

    fireEvent.press(screen.getByRole('button', { name: 'Thu nhap' }));
    expect(onTypeChange).toHaveBeenCalledWith('income');

    fireEvent.press(screen.getByRole('button', { name: 'An uong' }));
    expect(onCategoryChange).toHaveBeenCalledWith('cat-food');

    fireEvent.press(screen.getByRole('button', { name: 'Ngan hang ACB' }));
    expect(onAccountChange).toHaveBeenCalledWith('acc-bank');

    fireEvent.changeText(screen.getByLabelText('Tim kiem giao dich'), 'ca phe');
    expect(onSearchChange).toHaveBeenCalledWith('ca phe');
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
    const screen = render(<UndoBanner durationMs={5000} message="Da xoa giao dich" onUndo={onUndo} />);

    expect(screen.getByText('Da xoa giao dich')).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Hoan tac' }));
    fireEvent.press(screen.getByRole('button', { name: 'Hoan tac' }));

    expect(onUndo).toHaveBeenCalledTimes(1);
  });

  it('expires after the configured window and calls onExpire', () => {
    const onUndo = jest.fn();
    const onExpire = jest.fn();
    render(<UndoBanner durationMs={2000} message="Da xoa giao dich" onExpire={onExpire} onUndo={onUndo} />);

    jest.advanceTimersByTime(2000);

    expect(onExpire).toHaveBeenCalledTimes(1);
    expect(onUndo).not.toHaveBeenCalled();
  });
});
