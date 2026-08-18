import { TextEncoder, TextDecoder } from 'node:util';
import { setSettingsStore } from 'src/gitlab/digitalTwinConfig/settingsUtility';

const testSettings = {
  GROUP_NAME: 'dtaas',
  DT_DIRECTORY: 'digital_twins',
  COMMON_LIBRARY_PROJECT_NAME: 'common',
  RUNNER_TAG: 'linux',
  BRANCH_NAME: 'main',
  loggingEnabled: false,
  remoteLoggingEnabled: false,
};

Object.defineProperty(globalThis, 'TextEncoder', {
  value: TextEncoder,
  writable: true,
});

if (typeof globalThis.structuredClone !== 'function') {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const v8 = require('node:v8');
  globalThis.structuredClone = (val) =>
    v8.deserialize(v8.serialize(val)) as typeof val;
}

Object.defineProperty(globalThis, 'TextDecoder', {
  value: TextDecoder,
  writable: true,
});

Element.prototype.scrollIntoView ??= () => {};

setSettingsStore({
  getState: () => ({
    settings: testSettings,
  }),
});
