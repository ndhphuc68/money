import { render } from '@testing-library/react-native';

import { ReportCategoryChart } from '@/components/finance';

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
