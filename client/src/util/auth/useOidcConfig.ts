import { useState, useEffect } from 'react';
import {
  getClientID,
  getAuthority,
  getLogoutRedirectURI,
  getGitLabScopes,
  getRedirectURI,
} from '../envUtil';

export interface OidcConfig {
  authority: string;
  client_id: string;
  redirect_uri: string;
  response_type: string;
  scope: string;
  post_logout_redirect_uri: string;
  automaticSilentRenew: boolean;
  loadUserInfo: boolean;
}

export const useOidcConfig = (): OidcConfig | null => {
  const [oidcConfig, setOidcConfig] = useState<OidcConfig | null>(null);

  useEffect(() => {
    const CLIENT_ID = getClientID() ?? '';
    const AUTH_AUTHORITY = getAuthority() ?? '';
    const LOGOUT_URL = getLogoutRedirectURI() ?? '';
    const GITLAB_SCOPES = getGitLabScopes() ?? '';
    const REDIRECT_URI = getRedirectURI() ?? '';

    const config: OidcConfig = {
      authority: AUTH_AUTHORITY.toString(),
      client_id: CLIENT_ID.toString(),
      redirect_uri: REDIRECT_URI.toString(),
      response_type: 'code',
      scope: GITLAB_SCOPES.toString(),
      post_logout_redirect_uri: LOGOUT_URL.toString(),
      automaticSilentRenew: false,
      loadUserInfo: true,
    };
    setOidcConfig(config);
  }, []);

  return oidcConfig;
};
