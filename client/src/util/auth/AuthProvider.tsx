import * as React from 'react';
import { AuthProvider as OIDCAuthProvider } from 'react-oidc-context';
import { useOidcConfig } from './useOidcConfig';

interface AuthProviderProps {
  children: React.ReactNode;
}

const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const oidcConfig = useOidcConfig();

  if (!oidcConfig) {
    return <div>Loading...</div>;
  }

  return <OIDCAuthProvider {...oidcConfig}>{children}</OIDCAuthProvider>;
};

export default AuthProvider;
