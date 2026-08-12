delete globalThis.env;

// The package is installed from its generated tarball by the CI workflow.
// eslint-disable-next-line import/no-extraneous-dependencies
const model = await import('@into-cps-association/dtaas-model');
const requiredSelectors = [
  'selectExecutionHistoryEntries',
  'selectExecutionHistoryById',
  'selectSelectedExecutionId',
  'selectExecutionHistoryError',
];

if (model.formatName('example-digital-twin') !== 'Example digital twin') {
  throw new TypeError(
    'The package root returned an unexpected formatName result.',
  );
}

for (const selector of requiredSelectors) {
  if (typeof model[selector] !== 'function') {
    throw new TypeError(`The package root does not export ${selector}.`);
  }
}

if ('Asset' in model) {
  throw new TypeError('Asset must be exported as a type, not a runtime value.');
}
