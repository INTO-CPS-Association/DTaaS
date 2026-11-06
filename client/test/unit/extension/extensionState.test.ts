import type { ExtensionReducer } from '@into-cps-association/dtaas-sdk';
import extensionState from 'extension/extensionState';

describe('extensionState', () => {
  it('keeps an empty object when no extension has a slice', () => {
    const reducer = extensionState({});

    expect(reducer(undefined, { type: 'any' })).toEqual({});
  });

  it('mounts each slice under the id of its extension', () => {
    const counter = (state: number | undefined, action: { type: string }) =>
      (state ?? 0) + (action.type === 'wind/turn' ? 1 : 0);
    const reducer = extensionState({
      wind: counter as ExtensionReducer<unknown>,
    });

    const state = reducer(undefined, { type: 'wind/turn' });

    expect(state).toEqual({ wind: 1 });
  });
});
