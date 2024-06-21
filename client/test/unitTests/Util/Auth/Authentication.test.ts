import { signOut } from 'util/auth/Authentication';
import { useAuth } from 'react-oidc-context';
import { getLogoutRedirectURI } from 'util/envUtil';

jest.mock('react-oidc-context');
jest.mock('util/envUtil', () => ({
    getLogoutRedirectURI: jest.fn(),
}));

describe('signOut', () => {
    const mockUser = { id_token: "token" };
    const mockSignoutSilent = jest.fn();
    const mockClear = jest.fn();

    Object.defineProperty(global, 'fetch', {
        value: jest.fn(async (URL) => {
            switch (URL) {
                case "https://example.com/_oauth/logout":
                    return {
                        ok: true,
                        status: 401,
                        json: async () => { }
                    };
                default: {
                    throw new Error(`Unhandled request: ${URL}`);
                }
            }
        }),
        writable: true
    });

    beforeEach(() => {
        (useAuth as jest.Mock).mockReturnValue({
            signoutSilent: mockSignoutSilent,
            user: mockUser
        });
        (getLogoutRedirectURI as jest.Mock).mockReturnValue("https://example.com/");
        Object.defineProperty(window, 'document', {
            value: {
                cookie: "",
                addEventListener: jest.fn(),
                removeEventListener: jest.fn(),
            },
            writable: true
        });
        Object.defineProperty(window, 'sessionStorage', {
            value: {
                clear: mockClear,
            },
            writable: true
        });
        Object.defineProperty(window, "location", {
            value: { reload: jest.fn() },
            writable: true,
        })
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('expires _xsrf cookie', async () => {
        const auth = useAuth();
        await signOut(auth);

        expect(window.document.cookie).toBe('_xsrf=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;');
    });

    it('does not signoutSilent if auth.user is null', async () => {
        const auth = useAuth();
        auth.user = null;

        const signOutResult = await signOut(auth);

        expect(signOutResult).toBeUndefined();
        expect(mockSignoutSilent).not.toHaveBeenCalled();
    });

    it('signsOutSilent if user is authorized', async () => {
        const auth = useAuth();
        await signOut(auth);
        expect(mockSignoutSilent).toHaveBeenCalled();
    });

    it('fetches the URI from getLogoutRedirectURI', async () => {
        const auth = useAuth();
        await signOut(auth);
        expect(global.fetch).toHaveBeenCalledWith("https://example.com/_oauth/logout");
    });

    it('reloads the page', async () => {
        const auth = useAuth();
        await signOut(auth);

        expect(window.location.reload).toHaveBeenCalled();
    });

    it('throws an error if fetch rejects', async () => {
        const auth = useAuth();
        global.fetch = jest.fn().mockRejectedValueOnce("foo");
        await expect(signOut(auth)).rejects.toThrow(Error("Error occurred during logout: foo"));
    });

    it('throws an error if signOutSilent rejects', async () => {
        const auth = useAuth();
        auth.signoutSilent = jest.fn().mockRejectedValueOnce(new Error("signOutSilent rejected"));
        await expect(signOut(auth)).rejects.toThrow(Error("Error occurred during logout: Error: signOutSilent rejected"));
    });

    it('clears sessionStorage', async () => {
        const auth = useAuth();
        await signOut(auth);

        expect(mockClear).toHaveBeenCalled();
    });
})