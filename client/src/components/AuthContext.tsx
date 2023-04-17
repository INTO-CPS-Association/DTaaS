import * as React from 'react';
import useFakeAuth from './Auth';

interface AuthProviderProps {
  children: React.ReactNode;
}

const AuthContext = React.createContext<{
  isLoggedIn: boolean;
  logIn: () => void;
  logOut: () => void;
} | null>(null);

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const auth = useFakeAuth();
  return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = React.useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
