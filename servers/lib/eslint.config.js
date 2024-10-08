import { fixupConfigRules } from '@eslint/compat';
import { FlatCompat } from '@eslint/eslintrc';
import globals from 'globals';
import jest from 'eslint-plugin-jest';
import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import ts from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import imprt from 'eslint-plugin-import'; // 'import' is ambiguous & prettier has trouble

const flatCompat = new FlatCompat();

export default [
  {
    ...js.configs.recommended,
    files: ['src/**', 'test/**'],
  },
  {
    ...fixupConfigRules(flatCompat.extends('airbnb-base')),
    files: ['src/**', 'test/**'],
  },
  prettier,
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
    plugins: { jest, '@typescript-eslint': ts, import: imprt, ts },
    rules: {
      'import/no-extraneous-dependencies': ['error', { devDependencies: true }],
      'no-console': 'error',
      'import/first': 'error',
      'linebreak-style': 0, // disable linter linebreak rule, to allow for both unix and windows developement
      'import/no-unresolved': 'off', // Whatever IDE will pass an error if if the module is not found, so no reason for this..
      'import/extensions': 'off', // That includes the production build.. We use linter for code checking / clean code optimization..
      'no-use-before-define': 'off',
    },
    ignores: [
      'api/*',
      'build/*',
      'coverage/*',
      'dist/*',
      'node_modules/*',
      'script/*',
      'src/types.ts',
    ],
  },
];