module.exports = {
  preset: 'jest-expo',
  testMatch: ['<rootDir>/tests/**/*.test.ts?(x)'],
  moduleNameMapper: {
    '^expo-sqlite$': '<rootDir>/tests/data/local/expo-sqlite.mock.ts',
    '^@/(.*)$': '<rootDir>/src/$1',
  },
};
