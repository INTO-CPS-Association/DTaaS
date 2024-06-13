import { User } from 'oidc-client-ts';
import { useDispatch } from 'react-redux';
import { setUserName } from 'store/auth.slice';
import { AuthContextProps } from 'react-oidc-context';
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

export async function signOut(auth: AuthContextProps) {
  if (!auth.user) {
    return;
  }

  const LOGOUT_URL = getLogoutRedirectURI() ?? '';
  const idToken = auth.user.id_token;

  try {
    await auth.revokeTokens();
    await auth.removeUser();
    await auth.signoutRedirect({
      post_logout_redirect_uri: LOGOUT_URL.toString(),
      id_token_hint: idToken,
    }).then(()=>{fetch(`${window.env.REACT_APP_URL}_oauth/logout`);});
  } catch (error) {
    alert(error);
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