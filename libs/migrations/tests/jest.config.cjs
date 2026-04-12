const config = {
  displayName: '@apps/migrations',
  preset: '../../../jest.preset.js',
  testEnvironment: 'node',
  transform: {
    '^.+\\.[tj]s$': [
      'ts-jest',
      {
        tsconfig: '<rootDir>/../../../tsconfig.base.json',
      },
    ],
  },
  moduleFileExtensions: ['ts', 'js', 'json'],
  coverageDirectory: '../../coverage/libs/migrations',
  testMatch: ['<rootDir>/**/*.spec.ts'],
};

module.exports = config;
