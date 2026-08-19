import store from 'store/store';

describe('client store integration', () => {
  it('initializes the package environment with the runtime authority', () => {
    expect(store.getState().environment.AUTH_AUTHORITY).toBe(
      globalThis.env.REACT_APP_AUTH_AUTHORITY,
    );
  });
});
