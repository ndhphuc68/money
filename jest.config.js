module.exports = {
  preset: 'jest-expo',
  testMatch: ['**/tests/**/*.test.ts?(x)'],
  transformIgnorePatterns: [
    '/node_modules/(?!(.pnpm|react-native|@react-native|@react-native-community|expo|@expo|@expo-google-fonts|react-navigation|@react-navigation|@sentry/react-native|native-base|@noble/hashes|lucide-react-native))',
    '/node_modules/react-native-reanimated/plugin/',
  ],
  moduleNameMapper: {
    '^expo-sqlite$': '<rootDir>/tests/data/local/expo-sqlite.mock.ts',
    '^@react-native-community/datetimepicker$': '<rootDir>/tests/mocks/datetimepicker.mock.tsx',
    '^lucide-react-native$': '<rootDir>/tests/mocks/lucide-react-native.tsx',
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  setupFilesAfterEnv: ['<rootDir>/tests/jest.setup.js'],
};
