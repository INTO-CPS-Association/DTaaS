import * as React from 'react';
import { Navigate } from 'react-router-dom';
import { checkAccessTokenValidity } from '../util/authentication';


interface PrivateRouteProps {
    children: React.ReactNode;
    waitForAuthCheck?: boolean;
    delayAuthCheck?: number;
  }
  
  const PrivateRoute: React.FC<PrivateRouteProps> = ({
    children,
    waitForAuthCheck = false,
    delayAuthCheck,
  }) => {
    const [isAuthenticated, setIsAuthenticated] = React.useState<boolean | null>(null);
  
    React.useEffect(() => {
      const checkAuthentication = async () => {
        if (!waitForAuthCheck) {
          const accessToken = localStorage.getItem('accessToken');
          const authStatus = await checkAccessTokenValidity(accessToken);
          setIsAuthenticated(authStatus);
        }
      };
      checkAuthentication();
    }, [waitForAuthCheck]);
  
    React.useEffect(() => {
      if (waitForAuthCheck && delayAuthCheck) {
        const interval = setInterval(async () => {
          const accessToken = localStorage.getItem('accessToken');
          if (accessToken) {
            const authStatus = await checkAccessTokenValidity(accessToken);
            setIsAuthenticated(authStatus);
          }
        }, 1000);
  
        const timeout = setTimeout(() => {
          clearInterval(interval);
          if (isAuthenticated === null) {
            setIsAuthenticated(false);
          }
        }, delayAuthCheck * 1000);
  
        return () => {
          clearTimeout(timeout);
          clearInterval(interval);
        };
      }
      return undefined; // Add this line to fix the ESLint error
    }, [waitForAuthCheck, delayAuthCheck, isAuthenticated]);
  
    if (waitForAuthCheck && isAuthenticated === null) {
      return <>{children}</>;
    }
  
    if (isAuthenticated === null) {
      return <div>Loading...</div>;
    }
  
    if (isAuthenticated) {
      return <>{children}</>;
    }
  
    return <Navigate to="/" replace />;
  };
  
  export default PrivateRoute;
