import { renderHook } from '@testing-library/react';

const dispatch = jest.fn();

jest.mock('@gitbeaker/rest', () => ({ Gitlab: jest.fn() }));
jest.mock('store/store', () => ({
  __esModule: true,
  default: {
    getState: () => ({ auth: { userName: 'user1' }, settings: {} }),
    dispatch: (action: unknown) => dispatch(action),
  },
}));
jest.mock('extensions', () => ({
  __esModule: true,
  default: [{ id: 'Bad Id', name: '', version: '', sdk: 1 }],
}));
jest.mock('util/envUtil', () => ({
  ...jest.requireActual('util/envUtil'),
  useUsername: () => 'user1',
  useURLforLIB: () => 'https://dtaas.example/user1/tools',
}));

describe('the extension host of this client', () => {
  it('reports an extension it cannot load, and loads the client without it', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});

    const { default: host } = await import('extension/extensionHost');

    expect(host.enabled).toEqual([]);
    expect(warn).toHaveBeenCalledWith(
      expect.stringMatching(/^Extension Bad Id is not loaded: /),
    );
    warn.mockRestore();
  });

  it('raises a snackbar through the client store', async () => {
    const { sharedServices } = await import('extension/extensionHost');

    sharedServices.ui.snackbar('Saved', 'success');

    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        payload: { message: 'Saved', severity: 'success' },
      }),
    );
  });

  it('gives the user and the library address to a page through hooks', async () => {
    const { sharedServices } = await import('extension/extensionHost');

    const { result } = renderHook(() => ({
      user: sharedServices.auth.useUser(),
      library: sharedServices.library.useBaseUrl(),
    }));

    expect(result.current).toEqual({
      user: { username: 'user1' },
      library: 'https://dtaas.example/user1/tools',
    });
  });
});
