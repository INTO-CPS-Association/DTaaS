import MCR from 'monocart-coverage-reports';
import type { CoverageReportOptions } from 'monocart-coverage-reports';

// https://github.com/cenfun/monocart-coverage-reports
const coverageOptions: CoverageReportOptions = {
  name: 'Playwright Monocart Coverage Reports',

  reports: ['codecov', 'v8', 'console-details'],

  // Which files to collect coverage from.
  sourceFilter: (sourceName: string) => {
    const isFromNodeModules = sourceName.search(/node_modules\//) !== -1; // regexp match "node_modules/"
    const isFromOutEditor = sourceName.search(/out-editor\//) !== -1; // regexp match "out-editor/"
    const isTypeScript = sourceName.search(/\.tsx?$/) !== -1;
    const isMonacoFiles = /monaco-editor/.test(sourceName);

    if (isFromNodeModules) {
      return false;
    }
    if (isFromOutEditor) {
      return false;
    }
    if (!isTypeScript) {
      return false;
    }
    if (isMonacoFiles) {
      return false;
    }
    return true;
  },

  // Which URLs to collect coverage from.
  entryFilter: (entry: MCR.V8CoverageEntry) => {
    const isFromGitlab = entry.url.search(/gitlab\//) !== -1; // regexp match "gitlab/"
    const isCSS = entry.url.search(/\.css$/) !== -1;
    const isEnv = entry.url.search(/env\.js$/) !== -1;
    const isOutEditor = entry.url.search(/out-editor\//) !== -1; // regexp match "out-editor/"
    const isMonacoFiles =
      entry.url.search(/cdn\.jsdelivr\.net\/npm\/monaco-editor/) !== -1; // regexp match monaco editor from CDN
    if (isFromGitlab) {
      return false;
    }
    if (isCSS) {
      return false;
    }
    if (isEnv) {
      return false;
    }
    if (isOutEditor) {
      return false;
    }
    if (isMonacoFiles) {
      return false;
    }
    return true;
  },
  outputDir: './coverage/e2e',
};

export default coverageOptions;
