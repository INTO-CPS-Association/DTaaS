import { User } from 'oidc-client-ts';
import { useDispatch } from 'react-redux';
import { setUserName } from 'store/auth.slice';
import { useAuth } from 'react-oidc-context';
import {
  getAuthority,
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
  const accessToken = sessionStorage.getItem('access_token');
  const gitLabUrl = getAuthority();
  const auth = useAuth();

  if (accessToken) {
    const response = await fetch(`${gitLabUrl}oauth/token/revoke`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
        throw new Error('Sign out failed...');
    }
  }

  localStorage.clear();
  sessionStorage.clear();

  if(auth.user) {
    await auth.removeUser();
  }

  await auth.signoutRedirect();
}

export function wait(milliseconds: number): Promise<void> {
  return new Promise<void>((resolve) => {
    const onTimeout = () => {
      resolve();
    };
    setTimeout(onTimeout, milliseconds);
  });
}
