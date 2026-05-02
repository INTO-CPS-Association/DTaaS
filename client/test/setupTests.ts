import { TextEncoder, TextDecoder } from 'node:util';
import { setSettingsStore } from 'model/backend/gitlab/digitalTwinConfig/settingsUtility';
import { DEFAULT_SETTINGS, DEFAULT_MEASUREMENT } from 'store/settings.slice';

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

globalThis.env ??= {} as typeof globalThis.env;
globalThis.env.REACT_APP_AUTH_AUTHORITY ??= 'https://gitlab.example.com/';

setSettingsStore({
  getState: () =>
    ({ settings: { ...DEFAULT_SETTINGS, ...DEFAULT_MEASUREMENT } }) as never,
});
