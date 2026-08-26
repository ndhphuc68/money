import { act, render, waitFor } from '@testing-library/react-native';
import { AccessibilityInfo, StyleSheet } from 'react-native';

import { SplashScreen } from '@/features/finance/screens/splash-screen';
import { Locale, translate } from '@/i18n/translations';

const t = translate.bind(null, 'vi' as Locale);

describe('SplashScreen', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renders the Vimo brand, tagline, and loading label', async () => {
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);
    const screen = render(<SplashScreen t={t} />);

    expect(screen.getByText('Vimo')).toBeTruthy();
    expect(screen.getByText('Quản lý tài chính rõ ràng, sống an tâm mỗi ngày.')).toBeTruthy();
    expect(screen.getByText('Đang chuẩn bị dữ liệu')).toBeTruthy();
    expect(screen.getByLabelText('Vimo')).toBeTruthy();
    expect(screen.getByTestId('splash-logo')).toBeTruthy();
    expect(screen.getByTestId('splash-loader')).toBeTruthy();
    await waitFor(() => expect(AccessibilityInfo.isReduceMotionEnabled).toHaveBeenCalled());
  });

  it('checks the reduced motion preference before running motion-heavy animation', async () => {
    const spy = jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);

    render(<SplashScreen t={t} />);

    await waitFor(() => expect(spy).toHaveBeenCalled());
  });

  it('matches the approved splash layout alignment and background', async () => {
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);
    const screen = render(<SplashScreen t={t} />);

    await act(async () => {
      await Promise.resolve();
    });

    expect(StyleSheet.flatten(screen.getByTestId('splash-root').props.style)).toMatchObject({
      backgroundColor: '#F8FAFC',
    });
    expect(StyleSheet.flatten(screen.getByTestId('splash-copy-group').props.style)).toMatchObject({
      alignItems: 'center',
      width: '100%',
    });
    await waitFor(() => expect(AccessibilityInfo.isReduceMotionEnabled).toHaveBeenCalled());
  });
});
