module.exports = {
  preset: 'jest-expo',
  testMatch: ['**/tests/**/*.test.ts?(x)'],
  transformIgnorePatterns: [
    '/node_modules/(?!(.pnpm|react-native|@react-native|@react-native-community|expo|@expo|@expo-google-fonts|react-navigation|@react-navigation|@sentry/react-native|native-base|@noble/hashes|lucide-react-native|@expo/vector-icons))',
    '/node_modules/react-native-reanimated/plugin/',
  ],
  moduleNameMapper: {
    '^expo-sqlite$': '<rootDir>/tests/data/local/expo-sqlite.mock.ts',
    '^@react-native-community/datetimepicker$': '<rootDir>/tests/mocks/datetimepicker.mock.tsx',
    '^lucide-react-native$': '<rootDir>/tests/mocks/lucide-react-native.tsx',
    '^@expo/vector-icons/(.*)$': '<rootDir>/tests/mocks/expo-vector-icons.mock.tsx',
    '^@expo/vector-icons$': '<rootDir>/tests/mocks/expo-vector-icons.mock.tsx',
    '^@/(.*)$': '<rootDir>/src/$1',
  },
};
