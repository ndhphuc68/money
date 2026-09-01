import { render } from '@testing-library/react-native';

import { ReportCategoryChart, ReportIncomeExpenseChart } from '@/components/finance';

describe('ReportCategoryChart', () => {
  it('renders a legend row per slice with label and percent', () => {
    const screen = render(
      <ReportCategoryChart
        emptyLabel="Chưa có chi tiêu"
        slices={[
          {
            id: 'c1',
            label: 'Ăn uống',
            value: 400000,
            color: '#F2734A',
            percentLabel: '73%',
            icon: 'fa6:utensils',
          },
          { id: 'c2', label: 'Di chuyển', value: 150000, color: '#14B8A6', percentLabel: '27%' },
        ]}
      />,
    );

    expect(screen.getByText('Ăn uống')).toBeTruthy();
    expect(screen.getByText('73%')).toBeTruthy();
    expect(screen.getByText('Di chuyển')).toBeTruthy();
    expect(screen.getByText('27%')).toBeTruthy();
  });

  it('shows the empty label and no chart when there are no slices', () => {
    const screen = render(<ReportCategoryChart emptyLabel="Chưa có chi tiêu" slices={[]} />);

    expect(screen.getByText('Chưa có chi tiêu')).toBeTruthy();
    expect(screen.queryByTestId('mock-pie-chart')).toBeNull();
  });
});

describe('ReportIncomeExpenseChart', () => {
  it('renders income/expense legend rows with percent and amount when there is data', () => {
    const screen = render(
      <ReportIncomeExpenseChart
        emptyLabel="Chưa có dữ liệu"
        expense={400000}
        expenseLabel="Chi tiêu"
        income={1000000}
        incomeLabel="Thu nhập"
      />,
    );

    expect(screen.getByText('Thu nhập')).toBeTruthy();
    expect(screen.getByText('Chi tiêu')).toBeTruthy();
    expect(screen.getByText('71%')).toBeTruthy(); // round(1,000,000 / 1,400,000 * 100)
    expect(screen.getByText('29%')).toBeTruthy(); // 100 - 71
    expect(screen.getByTestId('mock-pie-chart')).toBeTruthy();
  });

  it('shows the empty label and no chart when income and expense are both zero', () => {
    const screen = render(
      <ReportIncomeExpenseChart
        emptyLabel="Chưa có dữ liệu"
        expense={0}
        expenseLabel="Chi tiêu"
        income={0}
        incomeLabel="Thu nhập"
      />,
    );

    expect(screen.getByText('Chưa có dữ liệu')).toBeTruthy();
    expect(screen.queryByTestId('mock-pie-chart')).toBeNull();
  });
});
