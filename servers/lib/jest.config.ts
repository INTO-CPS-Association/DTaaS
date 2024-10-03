import { createDefaultEsmPreset, type JestConfigWithTsJest } from 'ts-jest';

const jestConfig: JestConfigWithTsJest = {
  testEnvironment: 'node',
  transform: {
    ...createDefaultEsmPreset().transform,
    '\\.[jt]sx?$": "ts-jest': [
      'ts-jest',
      {
        useESM: true,
      },
    ],
  },
  collectCoverage: true,
  coverageReporters: ['text', 'cobertura', 'clover', 'lcov', 'json'],
  collectCoverageFrom: ['src/**/*.{ts,js}'],
  coveragePathIgnorePatterns: [
    'node_modules',
    './dist',
    './src/app.module.ts',
    './src/main.ts',
    './src/bootstrap.ts',
  ],
  extensionsToTreatAsEsm: ['.ts'],
  moduleFileExtensions: ['js', 'json', 'ts'],
  modulePathIgnorePatterns: [],
  coverageDirectory: '<rootDir>/coverage/',
  coverageThreshold: {
    global: {
      branches: 20,
      functions: 30,
      lines: 50,
      statements: 50,
    },
  },
  verbose: true,
  testRegex: './test/.*\\.spec.tsx?$',
  modulePaths: ['<rootDir>', '<rootDir>/src/', '<rootDir>/test/'],
  moduleDirectories: ['node_modules', 'src', 'test'],
  rootDir: './',
  roots: ['<rootDir>', 'src/', 'test/'],
  moduleNameMapper: {
    '^(\\.\\.?\\/.+)\\.jsx?$': '$1',
  },
};

export default jestConfig;
