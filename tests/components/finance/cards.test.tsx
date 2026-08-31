import { fireEvent, render } from '@testing-library/react-native';

import { BalanceCard, BudgetRow, GoalCard, StatCard, TransactionRow } from '@/components/finance';

describe('finance card components', () => {
  it('renders balance details and calls the mask toggle', () => {
    const onToggleMask = jest.fn();
    const screen = render(
      <BalanceCard
        label="Available balance"
        balance="$12,480"
        cardNumber="**** 2381"
        expiry="09/29"
        hideBalanceLabel="Hide balance"
        masked={false}
        onToggleMask={onToggleMask}
        showBalanceLabel="Show balance"
      />,
    );

    expect(screen.getByText('Available balance')).toBeTruthy();
    expect(screen.getByText('$12,480')).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Hide balance' }));
    expect(onToggleMask).toHaveBeenCalledTimes(1);
  });

  it('renders metric, transaction, budget, and goal content from clean caller text', () => {
    const screen = render(
      <>
        <StatCard label="Income" value="+$3,200" tone="positive" />
        <TransactionRow
          name="Coffee"
          category="Food"
          meta="Today"
          amount="-$4.50"
          icon="food"
          positive={false}
        />
        <BudgetRow
          accessibilityLabel="Dining budget 64%"
          category="Dining"
          spent="$320"
          limit="$500"
          percent={64}
          color="#F2734A"
        />
        <GoalCard
          accessibilityLabel="Emergency fund goal 42%"
          name="Emergency fund"
          initials="EF"
          due="Due Dec 2026"
          percent={42}
          saved="$4,200 saved"
          target="Target $10,000"
        />
      </>,
    );

    expect(screen.getByText('Income')).toBeTruthy();
    expect(screen.getByText('Coffee')).toBeTruthy();
    expect(screen.getByText('Food · Today')).toBeTruthy();
    expect(screen.getByText('$320 / $500')).toBeTruthy();
    expect(screen.getByText('$4,200 saved')).toBeTruthy();
    expect(screen.getByText('Target $10,000')).toBeTruthy();
  });

  it('does not duplicate category name in subtitle when name equals category', () => {
    const screen = render(
      <TransactionRow
        amount="-100.000 ₫"
        category="Hóa đơn & tiện ích"
        icon="bills"
        meta="31/08/2026 · Ví tiền mặt"
        name="Hóa đơn & tiện ích"
        positive={false}
      />,
    );

    expect(screen.getByText('Hóa đơn & tiện ích')).toBeTruthy();
    expect(screen.getByText('31/08/2026 · Ví tiền mặt')).toBeTruthy();
    expect(screen.queryByText('Hóa đơn & tiện ích · 31/08/2026 · Ví tiền mặt')).toBeNull();
  });
});
