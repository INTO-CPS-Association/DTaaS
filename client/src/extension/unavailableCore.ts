/**
 * The `signals` and `viz` services of a client without the common
 * visualisation core: no signal arrives, every connection reads `down` and
 * no visualisation is read or saved. An extension still gets every service of
 * the contract and can show that no live data is available.
 */

import type {
  SignalsService,
  VizService,
} from '@into-cps-association/dtaas-sdk';

const UNAVAILABLE = 'This client has no visualisation core';

function playhead() {
  let time = Date.now();
  return {
    get: () => time,
    set: (t: number) => {
      time = t;
    },
    follow: () => undefined,
    use: () => time,
  };
}

const signals = (): SignalsService => ({
  subscribe: () => () => undefined,
  valueAt: () => undefined,
  range: () => Promise.resolve([]),
  playhead: playhead(),
  registry: {
    search: () => Promise.resolve([]),
    get: () => Promise.reject(new Error(UNAVAILABLE)),
  },
  connection: { get: () => 'down', use: () => 'down' },
});

const viz = (): VizService => ({
  load: () => Promise.resolve(null),
  save: () => Promise.reject(new Error(UNAVAILABLE)),
  substrates: {
    get: () => Promise.reject(new Error(UNAVAILABLE)),
    list: () => [],
  },
  anchorKinds: [],
  presets: [],
});

export default function unavailableCore() {
  return { signals: signals(), viz: viz() };
}
