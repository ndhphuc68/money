import React from 'react';
import { render } from '@testing-library/react-native';
import RootScreen from '@/app/index';

describe('Expo foundation', () => {
  it('loads the default app screen', () => {
    const screen = render(React.createElement(RootScreen));

    expect(screen.getByText('Offline First Sync')).toBeTruthy();
  });
});
