import globals from 'globals';
import jest from 'eslint-plugin-jest';
import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import ts from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import imprt from 'eslint-plugin-import';

export default [
  {
    ignores: [
      'build/*',
      'coverage/*',
      'dist/*',
      'node_modules/*',
      'src/types.ts',
    ],
  },
  {
    ...js.configs.recommended,
    files: ['src/**', 'test/**'],
  },
  {
    languageOptions: {
      globals: {
        ...globals.jest,
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
    files: ['src/**', 'test/**'],
    plugins: { jest, '@typescript-eslint': ts, import: imprt },
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
