import js from '@eslint/js';
import typescript from '@typescript-eslint/eslint-plugin';
import prettier from 'eslint-config-prettier';
import airbnbBase from 'eslint-config-airbnb-base';
import jest from 'eslint-plugin-jest';


export default [
    js.configs.recommended,
    airbnbBase,
    typescript.configs.recommended,
    prettier,
    {
        files: ['**/*.js', '**/*.ts'],
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: 'module',
        },
        plugins: {
            jest,
            '@typescript-eslint': typescript,
        },
        rules: {
            'import/no-extraneous-dependencies': ['error', { devDependencies: true }],
            'no-console': 'error',
            'import/first': 'error',
            'linebreak-style': 0,
            'import/no-unresolved': 'off',
            'import/extensions': 'off',
            'no-use-before-define': 'off',
        },
        settings: {
            'import/resolver': {
                node: {
                    extensions: ['.js'],
                },
            },
        },
    },
    {
        files: ['**/*.ts'],
        languageOptions: {
            parser: '@typescript-eslint/parser',
            parserOptions: {
                project: ['./tsconfig.json'],
            },
        },
    },
    {
        ignores: ['api/', 'build/', 'dist/', 'node_modules/', 'script/', 'src/types.ts'],
    },
];
