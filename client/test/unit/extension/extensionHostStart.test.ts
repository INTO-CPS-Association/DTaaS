const dispatch = jest.fn();

jest.mock('@gitbeaker/rest', () => ({ Gitlab: jest.fn() }));
jest.mock('store/store', () => ({
  __esModule: true,
  default: {
    getState: () => ({ auth: { userName: 'user1' }, settings: {} }),
    dispatch: (action: unknown) => dispatch(action),
  },
}));
jest.mock('extensions', () => ({ __esModule: true, default: [] }));
jest.mock('extension/startExtensions', () => ({
  __esModule: true,
  default: () => Promise.reject(new Error('the start broke')),
}));

describe('the extension host when the start of the extensions fails', () => {
  it('tells the user and still gives the client its registry', async () => {
    const { default: host } = await import('extension/extensionHost');
    await Promise.resolve();

    expect(host.enabled).toEqual([]);
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        payload: {
          message: 'The extensions could not be started.',
          severity: 'error',
        },
      }),
    );
  });
});
