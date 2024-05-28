import { useAuth, User } from 'react-oidc-context';
import { useDispatch } from 'react-redux';
import { setUserName } from 'store/auth.slice';
import { UserManager } from 'oidc-client-ts';
import { getLogoutRedirectURI } from '../envUtil';

export interface CustomAuthContext {
  signoutRedirect: () => Promise<void>;
  removeUser: () => Promise<void>;
  signoutSilent: () => Promise<void>;
  revokeTokens: () => Promise<void>;
  user?: User | null | undefined;
}


export function getAndSetUsername(auth: CustomAuthContext) {
  const dispatch = useDispatch();
  if (auth.user !== null && auth.user !== undefined) {
    const profileUrl = auth.user.profile.profile ?? '';
    const username = profileUrl.split('/').filter(Boolean).pop() ?? '';
    sessionStorage.setItem('username', username ?? '');
    dispatch(setUserName(username));
  }
}

function clearCookies() {
  document.cookie.split(';').forEach(cookie => {
    const eqPos = cookie.indexOf('=');
    const name = eqPos > -1 ? cookie.substr(0, eqPos) : cookie;
    document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
  });
}

export async function signOut(userManager: UserManager) {
  const auth = useAuth();
  const LOGOUT_URL = getLogoutRedirectURI() ?? '';
 

  if (auth.user) {
    const idToken = auth.user.id_token;
    const accessToken = auth.user.access_token;

    try {
      // Sign out silently
      await userManager.signoutSilent();

      // Revoke tokens using the OAuth revoke API
      const revokeUrl = `${process.env.REACT_APP_REVOKE_URL}`;
      const clientSecret = process.env.REACT_APP_CLIENT_SECRET;

      if (clientSecret) {
        const revokeBody = {
          token: accessToken,
          token_type_hint: 'access_token',
          client_id: process.env.REACT_APP_CLIENT_ID,
          client_secret: clientSecret,
        };

        await fetch(revokeUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams(revokeBody).toString(),
        });
      } else {
        // console.error('Client secret is not defined');
      }

      // Clear storage
      localStorage.clear();
      sessionStorage.clear();
      clearCookies();

      // Make HTTP GET call to logout URL (if needed)
      await fetch(`${process.env.REACT_APP_URL}/_oauth/logout`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${idToken}`,
          'Content-Type': 'application/json',
        },
      });
    } catch (error) {
      // Handle the error scenario, e.g., log the error or show an error message to the user
    }
    await userManager.removeUser();
    await userManager.signoutRedirect({
      post_logout_redirect_uri: LOGOUT_URL.toString(),
      id_token_hint: idToken,
    });
    await userManager.getUser();
    
  }
}

export function wait(milliseconds: number): Promise<void> {
  return new Promise<void>((resolve) => {
    const onTimeout = () => {
      resolve();
    };
    setTimeout(onTimeout, milliseconds);
  });
}

// function App() {
//   const oidcConfig = useOidcConfig();

//   if (!oidcConfig) return null;

//   const userManager = createUserManager(oidcConfig);

//   return (
//     <AuthProvider userManager={userManager} onSigninCallback={onSigninCallback}>
//       {/* Your app components */}
//     </AuthProvider>
//   );
// }

// export default App;
