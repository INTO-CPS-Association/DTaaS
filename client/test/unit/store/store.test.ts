import store from 'store/store';

describe('client store integration', () => {
  it('initializes the package environment with the runtime authority', () => {
    expect(store.getState().environment.AUTH_AUTHORITY).toBe(
      globalThis.env.REACT_APP_AUTH_AUTHORITY,
    );
  });

  it('injects the client store into the real package environment boundary', () => {
    const setEnvironmentStore = jest.fn();
    let reloadedStore!: typeof store;

    jest.resetModules();
    jest.doMock('@into-cps-association/dt-automation', () => {
      const actual = jest.requireActual('@into-cps-association/dt-automation');
      return {
        ...actual,
        setEnvironmentStore: (value: unknown) => {
          setEnvironmentStore(value);
          actual.setEnvironmentStore(value);
        },
      };
    });
    jest.isolateModules(() => {
      reloadedStore =
        jest.requireActual<typeof import('store/store')>('store/store').default;
    });

    expect(setEnvironmentStore).toHaveBeenCalledWith(reloadedStore);
  });
});
