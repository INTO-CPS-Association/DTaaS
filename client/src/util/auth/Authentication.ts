import { User } from 'oidc-client-ts';
import { useDispatch } from 'react-redux';
import { setUserName } from 'store/auth.slice';
import { AuthContextProps } from 'react-oidc-context';
import { getLogoutRedirectURI, useAppURL, cleanURL } from 'util/envUtil';

export interface CustomAuthContext {
  signoutRedirect: () => Promise<void>;
  removeUser: () => Promise<void>;
  signoutSilent: () => Promise<void>;
  revokeTokens: () => Promise<void>;
  user?: User | null | undefined;
}

export function useGetAndSetUsername() {
  const dispatch = useDispatch();
  const getAndSetUsername = (auth: CustomAuthContext) => {
    if (!auth.user) {
      return;
    }
    const profileUrl = auth.user!.profile.profile ?? '';
    const username = profileUrl.split('/').filter(Boolean).pop() ?? '';
    sessionStorage.setItem('username', username ?? '');
    dispatch(setUserName(username));
  };
  return getAndSetUsername;
}

export function useSignOut() {
  const APP_URL = useAppURL();
  const CLEAN_APP_URL = cleanURL(APP_URL);
  const LOGOUT_URL = getLogoutRedirectURI() ?? '';
  const signOut = async (auth: AuthContextProps) => {
    if (!auth.user) {
      return;
    }

    const idToken = auth.user!.id_token;

    try {
      await auth.revokeTokens();
      await auth.removeUser();
      await auth.clearStaleState();
      sessionStorage.clear();
      document.cookie =
        '_xsrf=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
      await auth.signoutRedirect({
        post_logout_redirect_uri: LOGOUT_URL.toString(),
        id_token_hint: idToken,
      });
      await fetch(`${CLEAN_APP_URL}/_oauth/logout`, {
        signal: AbortSignal.timeout(30000),
      });
      setTimeout(() => {
        window.location.reload();
      }, 3000);
    } catch (e) {
      throw new Error(`Error occurred during logout: ${e}`);
    }
  };
  return signOut;
}

export function wait(milliseconds: number): Promise<void> {
  return new Promise<void>((resolve) => {
    const onTimeout = () => {
      resolve();
    };
    setTimeout(onTimeout, milliseconds);
  });
}
