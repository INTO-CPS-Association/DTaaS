import { signOut } from 'util/auth/Authentication';
import { useAuth } from 'react-oidc-context';
import { getLogoutRedirectURI } from 'util/envUtil';

jest.mock('react-oidc-context');
jest.mock('util/envUtil', () => ({
    getLogoutRedirectURI: jest.fn(),
}));

describe('signOut', () => {
    const user = { idToken: "token" };
    const signOutSilent = jest.fn();

    beforeEach(() => {
        (useAuth as jest.Mock).mockReturnValue({
            signOutSilent: signOutSilent,
            user: user
        });
    });

    afterEach(() => { jest.clearAllMocks(); })

    it('does not signOutSilent if auth.user is null', async () => {
        const auth = useAuth();
        auth.user = null;

        const signOutResult = await signOut(auth);

        expect(signOutResult).toBeUndefined();
        expect(signOutSilent).not.toHaveBeenCalled();
    });

    it('thows an error if the logout redirect URI does not exist', async () => {
        const auth = useAuth();

        (getLogoutRedirectURI as jest.Mock).mockReturnValue("");
        await expect(signOut(auth)).rejects.toThrow();
    });
})