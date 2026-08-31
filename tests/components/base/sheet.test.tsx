import { Text } from 'react-native';
import { fireEvent, render } from '@testing-library/react-native';

import { Sheet } from '@/components/base';

describe('Sheet', () => {
  it('renders the title, subtitle, and children, and closes via the close button', () => {
    const onClose = jest.fn();
    const screen = render(
      <Sheet closeLabel="Close" onClose={onClose} subtitle="Subtitle" title="Title" visible>
        <Text>Body</Text>
      </Sheet>,
    );

    expect(screen.getByText('Title')).toBeTruthy();
    expect(screen.getByText('Subtitle')).toBeTruthy();
    expect(screen.getByText('Body')).toBeTruthy();

    fireEvent.press(screen.getByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('omits the header entirely when no title is given', () => {
    const screen = render(
      <Sheet onClose={jest.fn()} visible>
        <Text>Body only</Text>
      </Sheet>,
    );

    expect(screen.getByText('Body only')).toBeTruthy();
    expect(screen.queryByRole('button')).toBeNull();
  });
});
