import { User } from 'oidc-client-ts';
import { useDispatch } from 'react-redux';
import { setUserName } from 'store/auth.slice';
import { useAuth } from 'react-oidc-context';
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

export function useSignOut() {
  const auth = useAuth();

  const signOut = async () => {
    const LOGOUT_URL = getLogoutRedirectURI() ?? '';

    if (auth.user) {
      const idToken = auth.user.id_token; // camelCase for variable name
      const accessToken = auth.user.access_token; // console log to see if this works

      try {
        // Sign out silently
        await auth.signoutSilent();

        // Revoke tokens using the OAuth revoke API
        await auth.revokeTokens();
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

        await auth.removeUser();
        await auth.signoutRedirect({
          post_logout_redirect_uri: LOGOUT_URL.toString(),
          id_token_hint: idToken,
        });

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
    }
  }
  return { signOut }
}

export function wait(milliseconds: number): Promise<void> {
  return new Promise<void>((resolve) => {
    const onTimeout = () => {
      resolve();
    };
    setTimeout(onTimeout, milliseconds);
  });
}