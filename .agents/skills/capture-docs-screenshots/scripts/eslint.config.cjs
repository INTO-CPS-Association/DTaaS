// Lint configuration for the Node scripts in this directory. The linters
// are installed only in CI; see the "Lint and Test Node Scripts" job in
// .github/workflows/lint-scripts.yml.
const js = require('@eslint/js');

module.exports = [
  js.configs.recommended,
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: 'commonjs',
      globals: {
        __dirname: 'readonly',
        console: 'readonly',
        module: 'writable',
        process: 'readonly',
        require: 'readonly',
        // Used inside functions that Playwright runs in the browser.
        document: 'readonly',
        getComputedStyle: 'readonly',
        PopStateEvent: 'readonly',
        window: 'readonly',
      },
    },
  },
];
