import { CoverageReportOptions } from 'monocart-coverage-reports';

// https://github.com/cenfun/monocart-coverage-reports
const coverageOptions: CoverageReportOptions = {
  name: 'Playwright Monocart Coverage Reports',

  reports: ['codecov', 'v8', 'console-summary'],

  outputDir: './coverage/e2e',
};

export default coverageOptions;
