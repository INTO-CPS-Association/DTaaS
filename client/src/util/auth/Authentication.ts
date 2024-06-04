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

async function revokeAccessToken(accessToken : string) {
  const clientSecret = process.env.REACT_APP_CLIENT_SECRET;
  if (!clientSecret) {
    return;
  }

  const revokeBody = {
    token: accessToken,
    token_type_hint: 'access_token',
    client_id: process.env.REACT_APP_CLIENT_ID,
    client_secret: clientSecret,
  };

  const revokeUrl = `${process.env.REACT_APP_REVOKE_URL}`;
  await fetch(revokeUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams(revokeBody).toString(),
  });
}

export async function signOut(auth: AuthContextProps) {
  if (!auth.user) {
    return;
  }

  const LOGOUT_URL = getLogoutRedirectURI() ?? '';
  const accessToken = auth.user.access_token;
  const idToken = auth.user.id_token;

  try {
    await auth.signoutSilent();
    await auth.revokeTokens();
    await revokeAccessToken(accessToken);
    await auth.removeUser();
    await auth.signoutRedirect({
      post_logout_redirect_uri: LOGOUT_URL.toString(),
      id_token_hint: idToken,
    });
    await fetch(`${process.env.REACT_APP_URL}/_oauth/logout`);
  } catch (error) {

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