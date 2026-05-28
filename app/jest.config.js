module.exports = {
  displayName: 'unit',
  preset: 'react-native',
  testMatch: ['**/__tests__/**/*.test.ts', '**/__tests__/**/*.test.tsx'],
  transform: {
    '^.+\\.[jt]sx?$': [
      'babel-jest',
      { presets: ['babel-preset-expo'] },
    ],
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
  setupFiles: [
    require.resolve('react-native/jest/setup.js'),
    './jest.setup.js',
  ],
  transformIgnorePatterns: [
    'node_modules/(?!(expo-secure-store|expo-constants|@expo|@expo-google-fonts|expo|react-native|@react-native|@testing-library|expo-router)/)',
  ],
  moduleNameMapper: {
    '^@expo-google-fonts/(.*)$': '<rootDir>/__mocks__/expo-google-fonts.js',
  },
}
