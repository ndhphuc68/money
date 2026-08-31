import { act, render, waitFor } from '@testing-library/react-native';
import RootScreen from '@/app/index';
import { createFinanceDependencies } from '@/features/finance/finance-dependencies';

jest.mock('@/data/local/db/provider', () => ({
  useLocalDatabase: () => ({}),
}));

jest.mock('@/features/finance/finance-dependencies', () => ({
  createFinanceDependencies: jest.fn(() => new Promise(() => {})),
}));

jest.mock('@/features/finance/screens/splash-screen', () => ({
  SplashScreen: ({ t }: { t: (key: 'splashLoading') => string }) => {
    const { Text } = require('react-native');
    return <Text testID="splash-logo">{t('splashLoading')}</Text>;
  },
}));

jest.mock('@/features/finance/screens/onboarding-screen', () => ({
  OnboardingScreen: () => null,
}));

jest.mock('@/features/finance/view-models/use-onboarding', () => ({
  useOnboarding: () => ({
    loading: false,
    step: 'display-name',
  }),
}));

describe('RootScreen startup', () => {
  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  it('shows the branded splash while finance dependencies load', async () => {
    const screen = render(<RootScreen />);

    expect(screen.getByTestId('splash-logo')).toBeTruthy();
    expect(screen.getByText('Đang chuẩn bị dữ liệu')).toBeTruthy();
    await waitFor(() => expect(screen.getByTestId('splash-logo')).toBeTruthy());
  });

  it('keeps the branded splash visible until timer finishes after dependencies resolve', async () => {
    jest.useFakeTimers();
    (createFinanceDependencies as jest.Mock).mockResolvedValue({
      onboarding: {},
    });

    const screen = render(<RootScreen />);

    await act(async () => {
      await Promise.resolve();
    });

    expect(screen.getByTestId('splash-logo')).toBeTruthy();

    act(() => {
      jest.advanceTimersByTime(899);
    });
    expect(screen.getByTestId('splash-logo')).toBeTruthy();

    await act(async () => {
      jest.advanceTimersByTime(1);
      await Promise.resolve();
    });
    expect(screen.queryByTestId('splash-logo')).toBeNull();
  });
});
