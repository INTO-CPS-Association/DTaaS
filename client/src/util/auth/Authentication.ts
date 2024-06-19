import { User } from 'oidc-client-ts';
import { useDispatch } from 'react-redux';
import { setUserName } from 'store/auth.slice';
import { AuthContextProps } from 'react-oidc-context';
import { getLogoutRedirectURI } from '../envUtil'

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

export async function signOut(auth: AuthContextProps) {
  if (!auth.user) {
    return;
  }

  try {
    sessionStorage.clear();
    document.cookie = '_xsrf=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';

    const logoutRedirectURI = getLogoutRedirectURI();
    await fetch(logoutRedirectURI);

    const idToken = auth.user.id_token;
    await auth.signoutRedirect({
      id_token_hint: idToken,
    });

    window.location.reload();
  } catch (e) {
    throw new Error(`Error occurred during logout: ${e}`);
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