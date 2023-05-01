import { useState, useEffect } from 'react';
import {
  generateNonce,
  generateCodeVerifier,
  generateCodeChallenge,
  getCodeVerifier,
} from './Authentication';
import { getClientID } from '../envUtil';

export interface OidcConfig {
  authority: string;
  client_id: string;
  redirect_uri: string;
  response_type: string;
  scope: string;
  post_logout_redirect_uri: string;
  automaticSilentRenew: boolean;
  loadUserInfo: boolean;
  code_verifier: string;
  extraQueryParams: {
    nonce: string;
    code_challenge: string;
    code_challenge_method: string;
  };
}

export const useOidcConfig = (): OidcConfig | null => {
  const [oidcConfig, setOidcConfig] = useState<OidcConfig | null>(null);

  useEffect(() => {
    const prepareConfig = async () => {
      const CLIENT_ID = getClientID() ?? '';
      const codeVerifier = getCodeVerifier() ?? generateCodeVerifier();
      const config: OidcConfig = {
        authority: 'https://gitlab.com',
        client_id: CLIENT_ID.toString(),
        redirect_uri: 'http://localhost:4000/library/',
        response_type: 'code',
        scope: 'openid profile read_user',
        post_logout_redirect_uri: 'http://localhost:4000/',
        automaticSilentRenew: false,
        loadUserInfo: true,
        code_verifier: codeVerifier,
        extraQueryParams: {
          nonce: generateNonce(),
          code_challenge: await generateCodeChallenge(codeVerifier),
          code_challenge_method: 'S256',
        },
      };
      setOidcConfig(config);
    };
    prepareConfig();
  }, []);

  return oidcConfig;
};
