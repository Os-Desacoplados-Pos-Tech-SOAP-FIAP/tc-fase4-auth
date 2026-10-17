module.exports = {
  testEnvironment: 'node',
  transform: { '^.+\.ts$': 'ts-jest' },
  testMatch: ['**/test/**/*.spec.ts'],
  collectCoverageFrom: ['src/**/*.ts'],
  coverageReporters: ['lcov', 'text-summary'],
  coverageThreshold: {
    global: { lines: 80, branches: 80, functions: 80, statements: 80 },
  },
};
