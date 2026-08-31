import { Text } from 'react-native';
import { fireEvent, render } from '@testing-library/react-native';

import { ListRow } from '@/components/base';

describe('ListRow', () => {
  it('renders title, subtitle, leading, and trailing content', () => {
    const screen = render(
      <ListRow
        leading={<Text>L</Text>}
        subtitle="Subtitle"
        title="Title"
        trailing={<Text>T</Text>}
      />,
    );

    expect(screen.getByText('Title')).toBeTruthy();
    expect(screen.getByText('Subtitle')).toBeTruthy();
    expect(screen.getByText('L')).toBeTruthy();
    expect(screen.getByText('T')).toBeTruthy();
  });

  it('is pressable and reports presses only when onPress is given', () => {
    const onPress = jest.fn();
    const screen = render(<ListRow onPress={onPress} title="Tap me" />);

    fireEvent.press(screen.getByRole('button', { name: 'Tap me' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('is not a button when onPress is omitted', () => {
    const screen = render(<ListRow title="Static row" />);

    expect(screen.queryByRole('button', { name: 'Static row' })).toBeNull();
  });
});
