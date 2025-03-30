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

async function performSignOutFlow(auth: AuthContextProps, appURL: string) {
  const LOGOUT_URL = getLogoutRedirectURI() ?? '';
  const idToken = auth.user!.id_token;

  await auth.revokeTokens();
  await auth.removeUser();
  await auth.clearStaleState();

  sessionStorage.clear();
  document.cookie = '_xsrf=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';

  await auth.signoutRedirect({
    post_logout_redirect_uri: LOGOUT_URL.toString(),
    id_token_hint: idToken,
  });

  await fetch(`${cleanURL(appURL)}/_oauth/logout`, {
    signal: AbortSignal.timeout(30000),
  });
}

export function useSignOut() {
  const APP_URL = useAppURL();
  const signOut = async (auth: AuthContextProps) => {
    if (!auth.user) {
      return;
    }
    try {
      await performSignOutFlow(auth, APP_URL);
    } catch (e) {
      throw new Error(`Error occurred during logout: ${e}`);
    }
  };
  return signOut;
}

export async function wait(milliseconds: number): Promise<void> {
  return new Promise<void>((resolve) => {
    const onTimeout = () => {
      resolve();
    };
    setTimeout(onTimeout, milliseconds);
  });
}
