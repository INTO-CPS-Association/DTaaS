delete globalThis.env;

const model = await import('@into-cps-association/dtaas-model');
const requiredSelectors = [
  'selectExecutionHistoryEntries',
  'selectExecutionHistoryById',
  'selectSelectedExecutionId',
  'selectExecutionHistoryError',
];

if (model.formatName('example-digital-twin') !== 'Example digital twin') {
  throw new Error('The package root returned an unexpected formatName result.');
}

for (const selector of requiredSelectors) {
  if (typeof model[selector] !== 'function') {
    throw new Error(`The package root does not export ${selector}.`);
  }
}

if ('Asset' in model) {
  throw new Error('Asset must be exported as a type, not a runtime value.');
}
