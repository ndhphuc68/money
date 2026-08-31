import { Text } from 'react-native';
import { render } from '@testing-library/react-native';

import { Card } from '@/components/base';

describe('Card', () => {
  it('renders its children', () => {
    const screen = render(
      <Card>
        <Text>Card content</Text>
      </Card>,
    );

    expect(screen.getByText('Card content')).toBeTruthy();
  });
});
