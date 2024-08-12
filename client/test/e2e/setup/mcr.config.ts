import { CoverageReportOptions } from 'monocart-coverage-reports';

// https://github.com/cenfun/monocart-coverage-reports
const coverageOptions: CoverageReportOptions = {
  name: 'Playwright Monocart Coverage Report',

  reports: ['codecov', 'v8'],

  // entryFilter: {
  //     '**/node_modules/**': false,
  //     '**/*.js': true
  // },

  // sourceFilter: {
  //     '**/node_modules/**': false,
  //     '**/*.js': true
  // },

  outputDir: './coverage/e2e',
};

export default coverageOptions;
