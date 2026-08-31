import { fireEvent, render } from '@testing-library/react-native';

import { PillChip } from '@/components/base';

describe('PillChip', () => {
  it('reflects active state via accessibilityState and reports presses', () => {
    const onPress = jest.fn();
    const screen = render(<PillChip active label="Cash" onPress={onPress} />);

    expect(screen.getByRole('button', { name: 'Cash' }).props.accessibilityState).toEqual({
      selected: true,
    });
    fireEvent.press(screen.getByRole('button', { name: 'Cash' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
