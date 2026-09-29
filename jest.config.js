/** @type {import('ts-jest').JestConfigWithTsJest} */
export default {
  preset: 'ts-jest',
  testEnvironment: 'node',
  extensionsToTreatAsEsm: ['.ts'],
  moduleNameMapper: {
    // The girs packages are type-only, which is all the tested code needs from them.
    '^gi://(.*)$': '<rootDir>/node_modules/@girs/$1',
    // Source files use the `.js` specifiers real ESM requires; Jest resolves the
    // TypeScript sources behind them.
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        useESM: true,
      },
    ],
  },
};
