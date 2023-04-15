import * as React from 'react';
import { Navigate } from 'react-router-dom';

interface PrivateRouteProps {
  children: React.ReactNode;
  useDummyAuth?: boolean;
}

class DummyAuth {
  private isAuthenticated: boolean;

  constructor(auth: boolean) {
    this.isAuthenticated = auth;
  }

  checkAuth() {
    return this.isAuthenticated;
  }
}

const PrivateRoute: React.FC<PrivateRouteProps> = ({ children, useDummyAuth = false }) => {
  const [isAuthenticated, setIsAuthenticated] = React.useState<boolean | null>(null);

  React.useEffect(() => {
    const dummyAuth = new DummyAuth(useDummyAuth);
    setIsAuthenticated(dummyAuth.checkAuth());
  }, [useDummyAuth]);

  if (isAuthenticated === null) {
    return <div>Loading...</div>;
  }

  if (isAuthenticated) {
    return <>{children}</>;
  }

  return <Navigate to="/" replace />;
};

export default PrivateRoute;