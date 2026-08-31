// Mock useSafeAreaInsets to return default values in tests
jest.mock('react-native-safe-area-context', () => {
  return {
    ...jest.requireActual('react-native-safe-area-context'),
    useSafeAreaInsets: jest.fn(() => ({
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
    })),
  };
});
