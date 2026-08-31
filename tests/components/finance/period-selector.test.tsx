import { fireEvent, render } from '@testing-library/react-native';

import { PeriodSelector } from '@/components/finance';

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

const LABELS = {
  apply: 'Áp dụng',
  close: 'Đóng',
  custom: 'Tùy chọn',
  customFrom: 'Từ ngày',
  customTo: 'Đến ngày',
  month: 'Tháng',
  next: 'Kỳ sau',
  previous: 'Kỳ trước',
  quarter: 'Quý',
  week: 'Tuần',
  year: 'Năm',
};

describe('PeriodSelector', () => {
  it('shows the current kind, range label, and calls onKindChange when a chip is pressed', () => {
    const onKindChange = jest.fn();
    const screen = render(
      <PeriodSelector
        customFrom="2026-08-01"
        customTo="2026-08-31"
        kind="month"
        labels={LABELS}
        onCustomFromChange={jest.fn()}
        onCustomToChange={jest.fn()}
        onKindChange={onKindChange}
        onNext={jest.fn()}
        onPrevious={jest.fn()}
        rangeLabel="Tháng 8/2026"
      />,
    );

    expect(screen.getByText('Tháng 8/2026')).toBeTruthy();
    fireEvent.press(screen.getByLabelText('Quý'));
    expect(onKindChange).toHaveBeenCalledWith('quarter');
  });

  it('calls onPrevious/onNext when the nav arrows are pressed for a non-custom kind', () => {
    const onPrevious = jest.fn();
    const onNext = jest.fn();
    const screen = render(
      <PeriodSelector
        customFrom="2026-08-01"
        customTo="2026-08-31"
        kind="week"
        labels={LABELS}
        onCustomFromChange={jest.fn()}
        onCustomToChange={jest.fn()}
        onKindChange={jest.fn()}
        onNext={onNext}
        onPrevious={onPrevious}
        rangeLabel="Tuần 24/08 - 30/08/2026"
      />,
    );

    fireEvent.press(screen.getByLabelText('Kỳ trước'));
    fireEvent.press(screen.getByLabelText('Kỳ sau'));
    expect(onPrevious).toHaveBeenCalledTimes(1);
    expect(onNext).toHaveBeenCalledTimes(1);
  });

  it('opens a custom-range sheet with two DateFields when the Custom chip is pressed', () => {
    const screen = render(
      <PeriodSelector
        customFrom="2026-08-01"
        customTo="2026-08-31"
        kind="week"
        labels={LABELS}
        onCustomFromChange={jest.fn()}
        onCustomToChange={jest.fn()}
        onKindChange={jest.fn()}
        onNext={jest.fn()}
        onPrevious={jest.fn()}
        rangeLabel="Tuần 24/08 - 30/08/2026"
      />,
    );

    fireEvent.press(screen.getByLabelText('Tùy chọn'));
    expect(screen.getByText('Từ ngày')).toBeTruthy();
    expect(screen.getByText('Đến ngày')).toBeTruthy();
  });
});
