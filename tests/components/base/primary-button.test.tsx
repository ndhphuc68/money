import { fireEvent, render } from '@testing-library/react-native';

import { PrimaryButton } from '@/components/base';

describe('PrimaryButton', () => {
  it('renders the label as the accessible name and reports presses', () => {
    const onPress = jest.fn();
    const screen = render(<PrimaryButton label="Save" onPress={onPress} />);

    expect(screen.getByText('Save')).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Save' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('marks itself disabled and does not report presses', () => {
    const onPress = jest.fn();
    const screen = render(<PrimaryButton disabled label="Save" onPress={onPress} />);

    expect(screen.getByRole('button', { name: 'Save' }).props.accessibilityState).toEqual({
      disabled: true,
    });
    fireEvent.press(screen.getByRole('button', { name: 'Save' }));
    expect(onPress).not.toHaveBeenCalled();
  });
});
