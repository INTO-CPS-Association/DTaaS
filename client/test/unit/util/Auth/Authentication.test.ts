import { useSignOut } from 'util/auth/Authentication';
import { useAuth } from 'react-oidc-context';
import { getLogoutRedirectURI, useAppURL, cleanURL } from 'util/envUtil';

jest.mock('react-oidc-context');
jest.mock('util/envUtil', () => ({
  getLogoutRedirectURI: jest.fn(),
  useAppURL: jest.fn(),
  cleanURL: jest.fn(),
}));
jest.useFakeTimers();

describe('useSignOut', () => {
  const mockUser = { id_token: 'token' };
  const mockSignoutRedirect = jest.fn();
  const mockRevokeTokens = jest.fn();
  const mockClearStaleState = jest.fn();
  const mockremoveUser = jest.fn();
  const mockClear = jest.fn();

  Object.defineProperty(AbortSignal, 'timeout', {
    value: jest.fn(),
    writable: false,
  });

  Object.defineProperty(global, 'fetch', {
    value: jest.fn(async (URL, signal) => {
      signal();
      switch (URL) {
        case 'https://foo.com/_oauth/logout':
          return {
            ok: true,
            status: 401,
            json: async () => {},
          };
        default: {
          throw new Error(`Unhandled request: ${URL}`);
        }
      }
    }),
    writable: true,
  });

  beforeEach(() => {
    (useAuth as jest.Mock).mockReturnValue({
      signoutRedirect: mockSignoutRedirect,
      revokeTokens: mockRevokeTokens,
      clearStaleState: mockClearStaleState,
      removeUser: mockremoveUser,
      user: mockUser,
    });
    (getLogoutRedirectURI as jest.Mock).mockReturnValue(
      'https://logoutredirecturi.com/',
    );
    (useAppURL as jest.Mock).mockReturnValue('https://foo.com/');
    (cleanURL as jest.Mock).mockReturnValue('https://foo.com');
    Object.defineProperty(window, 'document', {
      value: {
        cookie: '',
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
      },
      writable: true,
    });
    Object.defineProperty(window, 'sessionStorage', {
      value: {
        clear: mockClear,
      },
      writable: true,
    });
    Object.defineProperty(window, 'location', {
      value: { reload: jest.fn() },
      writable: true,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('expires _xsrf cookie', async () => {
    const auth = useAuth();
    const signOut = useSignOut();
    await signOut(auth);

    expect(window.document.cookie).toBe(
      '_xsrf=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;',
    );
  });

  it('does not signoutRedirect if auth.user is null', async () => {
    const auth = useAuth();
    const signOut = useSignOut();

    auth.user = null;

    const signOutResult = await signOut(auth);

    expect(signOutResult).toBeUndefined();
    expect(mockSignoutRedirect).not.toHaveBeenCalled();
  });

  it('signsOutRedirect, clearStaleState, removeTokens and removeUer if user is authorized', async () => {
    const auth = useAuth();
    const signOut = useSignOut();
    await signOut(auth);
    expect(useAppURL).toHaveBeenCalled();
    expect(cleanURL).toHaveBeenCalled();
    expect(mockSignoutRedirect).toHaveBeenCalled();
    expect(mockClearStaleState).toHaveBeenCalled();
    expect(mockRevokeTokens).toHaveBeenCalled();
    expect(mockremoveUser).toHaveBeenCalled();
  });

  it('fetches the URI from window.env', async () => {
    const auth = useAuth();
    const signOut = useSignOut();
    const fetchBody = { signal: AbortSignal.timeout(30000) };
    await signOut(auth);
    expect(global.fetch).toHaveBeenCalledWith(
      'https://foo.com/_oauth/logout',
      fetchBody,
    );
  });

  it('throws an error if fetch rejects', async () => {
    const auth = useAuth();
    const signOut = useSignOut();
    global.fetch = jest.fn().mockRejectedValueOnce('foo');
    await expect(signOut(auth)).rejects.toThrow(
      Error('Error occurred during logout: foo'),
    );
  });

  it('throws an error if signoutRedirect rejects', async () => {
    const auth = useAuth();
    const signOut = useSignOut();
    auth.signoutRedirect = jest
      .fn()
      .mockRejectedValueOnce(new Error('signoutRedirect rejected'));
    await expect(signOut(auth)).rejects.toThrow(
      Error('Error occurred during logout: Error: signoutRedirect rejected'),
    );
  });

  it('clears sessionStorage', async () => {
    const auth = useAuth();
    const signOut = useSignOut();
    await signOut(auth);

    expect(mockClear).toHaveBeenCalled();
  });
});
