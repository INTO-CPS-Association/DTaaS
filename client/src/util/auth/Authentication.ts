import { User } from 'oidc-client-ts';
import { useDispatch } from 'react-redux';
import { setUserName } from 'store/auth.slice';
import { useAuth } from 'react-oidc-context';
import {
  getLogoutRedirectURI,
} from '../envUtil';

export interface CustomAuthContext {
  signoutRedirect: () => Promise<void>;
  removeUser: () => Promise<void>;
  user?: User | null | undefined;
}

export function getAndSetUsername(auth: CustomAuthContext) {
  const dispatch = useDispatch();
  if (auth.user !== null && auth.user !== undefined) {
    const profileUrl = auth.user.profile.profile ?? '';
    const username = profileUrl.split('/').filter(Boolean).pop() ?? '';
    dispatch(setUserName(username));
  }
}


export async function signOut() {
  const auth = useAuth();
  const LOGOUT_URL = getLogoutRedirectURI() ?? '';

  if(auth.user) {
    const id_token = auth.user.id_token;

    // eslint-disable-next-line no-console
    console.log("ID TOKEN: ", id_token);
    // eslint-disable-next-line no-console
    console.log("ID TOKEN PROFILE: ", auth.user.profile.id_token);

    localStorage.clear();
    sessionStorage.clear();

    await auth.removeUser();

    await auth.signoutRedirect({
      post_logout_redirect_uri: LOGOUT_URL.toString(),
      id_token_hint: id_token
    });
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
