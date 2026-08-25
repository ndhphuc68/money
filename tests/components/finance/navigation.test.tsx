import { fireEvent, render } from '@testing-library/react-native';

import { BottomNav, SegmentedControl, SettingsList } from '@/components/finance';

describe('finance navigation controls', () => {
  it('renders an accessible segmented control and reports selection changes', () => {
    const onChange = jest.fn();
    const screen = render(<SegmentedControl options={['Week', 'Month']} value="Week" onChange={onChange} />);

    expect(screen.getByRole('button', { name: 'Week' }).props.accessibilityState).toEqual({ selected: true });
    fireEvent.press(screen.getByRole('button', { name: 'Month' }));
    expect(onChange).toHaveBeenCalledWith('Month');
  });

  it('renders settings rows and bottom navigation actions', () => {
    const onSelect = jest.fn();
    const onChange = jest.fn();
    const onAdd = jest.fn();
    const screen = render(
      <>
        <SettingsList items={[{ label: 'Currency', iconColor: '#2F6FED' }]} onSelect={onSelect} />
        <BottomNav
          items={[
            { key: 'overview', label: 'Overview', icon: 'overview' },
            { key: 'list', label: 'List', icon: 'list' },
            { key: 'goals', label: 'Goals', icon: 'target' },
            { key: 'profile', label: 'Profile', icon: 'profile' },
          ]}
          activeKey="overview"
          addAccessibilityLabel="Add transaction"
          onChange={onChange}
          onAdd={onAdd}
        />
      </>,
    );

    fireEvent.press(screen.getByRole('button', { name: 'Currency' }));
    fireEvent.press(screen.getByRole('button', { name: 'List' }));
    fireEvent.press(screen.getByRole('button', { name: 'Add transaction' }));

    expect(onSelect).toHaveBeenCalledWith(0);
    expect(onChange).toHaveBeenCalledWith('list');
    expect(onAdd).toHaveBeenCalledTimes(1);
  });
});
