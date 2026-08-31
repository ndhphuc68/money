import { render } from '@testing-library/react-native';

import { ReportCategoryChart, ReportTrendChart } from '@/components/finance';

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

describe('ReportTrendChart', () => {
  it('renders income/expense legend labels when there are points', () => {
    const screen = render(
      <ReportTrendChart
        emptyLabel="Chưa có dữ liệu"
        expenseLegendLabel="Chi tiêu"
        incomeLegendLabel="Thu nhập"
        points={[
          { key: '2026-06', label: '06', income: 1000000, expense: 400000 },
          { key: '2026-07', label: '07', income: 1200000, expense: 500000 },
        ]}
      />,
    );

    expect(screen.getByText('Thu nhập')).toBeTruthy();
    expect(screen.getByText('Chi tiêu')).toBeTruthy();
    expect(screen.getByTestId('mock-line-chart')).toBeTruthy();
  });

  it('shows the empty label and no chart when there are no points', () => {
    const screen = render(
      <ReportTrendChart
        emptyLabel="Chưa có dữ liệu"
        expenseLegendLabel="Chi tiêu"
        incomeLegendLabel="Thu nhập"
        points={[]}
      />,
    );

    expect(screen.getByText('Chưa có dữ liệu')).toBeTruthy();
    expect(screen.queryByTestId('mock-line-chart')).toBeNull();
  });
});
