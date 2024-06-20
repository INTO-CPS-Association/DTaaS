/* eslint-disable */
import { signOut } from 'util/auth/Authentication';
import { useAuth } from 'react-oidc-context';
import { getLogoutRedirectURI } from 'util/envUtil';

jest.mock('react-oidc-context');
jest.mock('util/envUtil', () => ({
    getLogoutRedirectURI: jest.fn(),
}));

describe('signOut', () => {
    const user = { idToken: "token" };
    const signoutSilent = jest.fn();
    const clear = jest.fn();
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
            signoutSilent: signoutSilent,
            user: user
        });
    });

    afterEach(() => { jest.clearAllMocks(); })

    it('does not signoutSilent if auth.user is null', async () => {
        const auth = useAuth();
        auth.user = null;

        const signOutResult = await signOut(auth);

        expect(signOutResult).toBeUndefined();
        expect(signoutSilent).not.toHaveBeenCalled();
    });

    it('fetches the URI from getLogoutRedirectURI', async () => {
        const auth = useAuth();
        (getLogoutRedirectURI as jest.Mock).mockReturnValue("https://example.com/");
        await signOut(auth);
        expect(global.fetch).toHaveBeenCalledWith("https://example.com/_oauth/logout");
    });

    it('throws an error if the logout redirect URI does not exist', async () => {
        const auth = useAuth();
        (getLogoutRedirectURI as jest.Mock).mockReturnValue("foo.com");
        try {
            await signOut(auth);
        } catch (e) {
            expect(global.fetch).toHaveBeenCalled();
            expect(e).toBeInstanceOf(Error);
        }
    });

    it('clears sessionStorage', async () => {
        const auth = useAuth();
        Object.defineProperty(window, 'sessionStorage', {
            value: {
                clear: clear,
            },
            writable: true
        });
        await signOut(auth);

        expect(clear).toHaveBeenCalled();
    });
})