// Lint configuration for the dependency-free Node scripts in this
// directory. The linters are installed only in CI; see the
// "Lint and Test Node Scripts" job in .github/workflows/lint-scripts.yml.
const js = require('@eslint/js');

module.exports = [
  js.configs.recommended,
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: 'commonjs',
      globals: {
        console: 'readonly',
        fetch: 'readonly',
        module: 'writable',
        process: 'readonly',
        require: 'readonly',
        structuredClone: 'readonly',
      },
    },
  },
];
