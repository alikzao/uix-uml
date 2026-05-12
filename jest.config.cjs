module.exports = {
  rootDir: '.',
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.js'],
  clearMocks: true,
  restoreMocks: true,
  moduleNameMapper: {
    '^/modules/core/js/(.*)$': '<rootDir>/../../../core/static/js/$1'
  }
};
