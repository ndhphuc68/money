import { Text } from 'react-native';
import { fireEvent, render } from '@testing-library/react-native';

import { IconButton } from '@/components/base';

describe('IconButton', () => {
  it('renders its icon and reports presses', () => {
    const onPress = jest.fn();
    const screen = render(
      <IconButton accessibilityLabel="Close" icon={<Text>X</Text>} onPress={onPress} />,
    );

    fireEvent.press(screen.getByRole('button', { name: 'Close' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('does not report presses while disabled', () => {
    const onPress = jest.fn();
    const screen = render(
      <IconButton accessibilityLabel="Close" disabled icon={<Text>X</Text>} onPress={onPress} />,
    );

    fireEvent.press(screen.getByRole('button', { name: 'Close' }));
    expect(onPress).not.toHaveBeenCalled();
  });
});
