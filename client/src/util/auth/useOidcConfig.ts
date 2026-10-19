import { useMemo } from 'react';
import { InMemoryWebStorage, WebStorageStateStore } from 'oidc-client-ts';
import {
  getClientID,
  getAuthority,
  getLogoutRedirectURI,
  getGitLabScopes,
  getRedirectURI,
} from 'util/envUtil';

export interface OidcConfig {
  authority: string;
  client_id: string;
  redirect_uri: string;
  response_type: string;
  scope: string;
  post_logout_redirect_uri: string;
  automaticSilentRenew: boolean;
  loadUserInfo: boolean;
  userStore: WebStorageStateStore;
}

/**
 * The signed-in user, with the access and id tokens, lives in the memory of
 * the page and not in sessionStorage, so a script that runs in the page by
 * mistake cannot read a token from storage, and a closed tab leaves nothing
 * behind. A reload therefore starts signed out, and signing in again returns
 * at once while the GitLab session is still open. Silent renewal stays off,
 * since it needs GitLab inside a frame, which GitLab does not allow.
 */
const userStore = () =>
  new WebStorageStateStore({ store: new InMemoryWebStorage() });

/** The configuration `env.js` describes, or null when it lacks the provider. */
function oidcConfigFromEnv(): OidcConfig | null {
  const CLIENT_ID = getClientID();
  const AUTH_AUTHORITY = getAuthority();

  const hasRequiredConfig = CLIENT_ID && AUTH_AUTHORITY;
  if (!hasRequiredConfig) {
    return null;
  }

  return {
    authority: AUTH_AUTHORITY.toString(),
    client_id: CLIENT_ID.toString(),
    redirect_uri: (getRedirectURI() ?? '').toString(),
    response_type: 'code',
    scope: (getGitLabScopes() ?? '').toString(),
    post_logout_redirect_uri: (getLogoutRedirectURI() ?? '').toString(),
    automaticSilentRenew: false,
    loadUserInfo: true,
    userStore: userStore(),
  };
}

export const useOidcConfig = (): OidcConfig | null =>
  useMemo<OidcConfig | null>(() => oidcConfigFromEnv(), []);
