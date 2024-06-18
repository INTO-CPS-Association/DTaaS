import { signOut } from 'util/auth/Authentication';
import { useAuth } from 'react-oidc-context';

jest.mock('react-oidc-context');

describe('signOut', () => {
    const user = { idToken: "token" };
    const signOutSilent = jest.fn();;

    beforeEach(() => {
        (useAuth as jest.Mock).mockReturnValue({
            signOutSilent: signOutSilent,
            user: user
        })
    });

    afterEach(() => { jest.clearAllMocks(); })

    it('returns if auth.user is null', async () => {
        const auth = useAuth();
        auth.user = null;

        const signOutResult = await signOut(auth);

        expect(signOutResult).toBeUndefined();
        expect(signOutSilent).not.toHaveBeenCalled();
    })
})