module.exports = {
  preset: 'jest-expo',
  testMatch: ['<rootDir>/tests/ui/**/*.test.tsx'],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native|expo(nent)?|@expo(nent)?/.*|expo-router|@expo/.*|react-navigation|@react-navigation/.*|@shopify/flash-list))',
  ],
};
