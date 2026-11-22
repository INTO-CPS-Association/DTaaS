import globals from 'globals';
import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import ts from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import imprt from 'eslint-plugin-import';

const TS_FILES = ['src/**/*.ts', 'test/**/*.ts'];

export default [
  {
    ignores: ['coverage/*', 'dist/*', 'node_modules/*'],
  },
  {
    ...js.configs.recommended,
    files: TS_FILES,
  },
  ...ts.configs['flat/recommended'].map((config) => ({
    ...config,
    files: TS_FILES,
  })),
  {
    languageOptions: {
      globals: {
        ...globals.node,
        Atomics: 'readonly',
        SharedArrayBuffer: 'readonly',
      },
      parser: tsParser,
      parserOptions: {
        project: './tsconfig.json',
        requireConfigFile: false,
        ecmaVersion: 2022,
        ecmaFeatures: { modules: true },
      },
    },
    files: TS_FILES,
    plugins: { '@typescript-eslint': ts, import: imprt },
    rules: {
      ...prettier.rules,
      'import/no-extraneous-dependencies': ['error', { devDependencies: true }],
      'no-console': 'error',
      'import/first': 'error',
      'linebreak-style': 0,
      'import/no-unresolved': 'off',
      'import/extensions': 'off',
      'no-use-before-define': 'off',
    },
  },
];
