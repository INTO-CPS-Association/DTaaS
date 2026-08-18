import path from 'node:path';
import { createRequire } from 'node:module';

const workingDirectory = process.cwd();
const packageDirectory = workingDirectory.endsWith('dt-automation')
  ? workingDirectory
  : path.join(workingDirectory, 'dt-automation');
const require = createRequire(path.join(packageDirectory, 'package.json'));
const jest = require('eslint-plugin-jest');
const typescriptEslint = require('@typescript-eslint/eslint-plugin');
const globals = require('globals');
const tsParser = require('@typescript-eslint/parser');
const js = require('@eslint/js');
const { FlatCompat } = require('@eslint/eslintrc');

const compat = new FlatCompat({
  baseDirectory: packageDirectory,
  resolvePluginsRelativeTo: packageDirectory,
  recommendedConfig: js.configs.recommended,
  allConfig: js.configs.all,
});

export default [
  {
    ignores: ['**/coverage/', '**/*.d.ts', '**/dist/', '**/node_modules/'],
  },
  ...compat.extends(
    'eslint:recommended',
    'airbnb-base',
    'plugin:@typescript-eslint/recommended',
    'prettier',
  ),
  {
    plugins: {
      jest,
      '@typescript-eslint': typescriptEslint,
    },
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.jest,
        ...jest.environments.globals.globals,
        Atomics: 'readonly',
        SharedArrayBuffer: 'readonly',
      },
      parser: tsParser,
      ecmaVersion: 11,
      sourceType: 'module',
      parserOptions: {
        requireConfigFile: false,
      },
    },
    settings: {
      'import/resolver': {
        node: { extensions: ['.js'] },
      },
    },
    rules: {
      'import/no-extraneous-dependencies': ['error', { devDependencies: true }],
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          caughtErrorsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          argsIgnorePattern: '^_',
        },
      ],
      'class-methods-use-this': 'off',
      'no-underscore-dangle': 'off',
      'no-param-reassign': 'off',
      'global-require': 'off',
      'vars-on-top': 'off',
      'no-console': 'error',
      'linebreak-style': 0,
      'import/no-unresolved': 'off',
      'import/extensions': 'off',
      'no-use-before-define': 'off',
      'no-unreachable': 'error',
      'consistent-return': 'off',
      'no-restricted-syntax': 'off',
      'no-restricted-globals': [
        'error',
        {
          name: 'global',
          message:
            "Use 'globalThis' instead of 'global' for cross-platform compatibility.",
        },
      ],
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'util',
              message:
                "Use 'node:util' instead of 'util' to explicitly import Node.js built-in modules.",
            },
            {
              name: 'path',
              message:
                "Use 'node:path' instead of 'path' to explicitly import Node.js built-in modules.",
            },
            {
              name: 'fs',
              message:
                "Use 'node:fs' instead of 'fs' to explicitly import Node.js built-in modules.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: tsParser,
      ecmaVersion: 5,
      sourceType: 'script',
      parserOptions: {
        requireConfigFile: false,
        project: [path.join(packageDirectory, 'tsconfig.eslint.json')],
      },
    },
    rules: {
      '@typescript-eslint/no-unnecessary-type-assertion': 'off',
    },
  },
  {
    files: ['**/*.slice.ts'],
    rules: {
      'no-param-reassign': ['error', { props: false }],
    },
  },
  {
    files: ['test/**/*.ts', 'test/**/*.tsx'],
    rules: {
      'no-restricted-globals': [
        'error',
        {
          name: 'global',
          message:
            "Use 'globalThis' instead of 'global' for cross-platform compatibility.",
        },
        {
          name: 'window',
          message:
            "Use 'globalThis' instead of 'window' for cross-platform compatibility in tests.",
        },
      ],
    },
  },
];
