import React, { ReactNode, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from 'react-oidc-context';
import ExecutionHistoryLoader from 'components/execution/ExecutionHistoryLoader';
import WaitNavigateAndReload from 'route/auth/WaitAndNavigate';
import { useLogger } from 'util/logger/useLogger';
import { clearAccessToken, setAccessToken } from 'util/auth/accessToken';
import { useGetAndSetUsername } from 'util/auth/Authentication';

interface PrivateRouteProps {
  children: ReactNode;
}

type RouteState = 'loading' | 'error' | 'unauthenticated' | 'authenticated';

function getRouteState(auth: ReturnType<typeof useAuth>): RouteState {
  const states: Array<[() => boolean, RouteState]> = [
    [() => auth.isLoading, 'loading'],
    [() => Boolean(auth.error), 'error'],
    // A session with no user should not happen in react-oidc-context. If it
    // ever does, the route has no token to hand its children, so it sends the
    // person to sign in again instead of rendering a page whose every request
    // would be refused.
    [() => !auth.isAuthenticated || !auth.user, 'unauthenticated'],
  ];
  return states.find(([matches]) => matches())?.[1] ?? 'authenticated';
}

function storeAccessToken(
  isAuthenticated: boolean,
  user: ReturnType<typeof useAuth>['user'],
): void {
  // Cleared and not simply left alone, so a session that ends, or a move to a
  // public route, does not leave the last token in the module for the life of
  // the document. A session with no user clears it too, and the route state
  // above turns that into the sign-in redirect.
  if (!isAuthenticated || !user) {
    clearAccessToken();
    return;
  }
  setAccessToken(user.access_token);
}

function renderRouteState(
  routeState: RouteState,
  error: { message: string } | undefined,
  children: ReactNode,
): ReactNode {
  const views: Record<RouteState, ReactNode> = {
    loading: <div>Loading...</div>,
    error: (
      <div>
        Oops... {error?.message}
        <WaitNavigateAndReload />
      </div>
    ),
    unauthenticated: <Navigate to="/" replace />,
    authenticated: (
      <>
        {children}
        <ExecutionHistoryLoader />
      </>
    ),
  };
  return views[routeState];
}

const PrivateRoute: React.FC<PrivateRouteProps> = ({ children }) => {
  const auth = useAuth();
  useLogger();

  // During render and not in an effect. An effect runs after the children,
  // and a child that fetches on mount would find no token on the first render
  // after a reload. Assigning a module variable has no other consequence.
  storeAccessToken(auth.isAuthenticated, auth.user);

  const routeState = getRouteState(auth);

  // The user name goes into every workspace address, the embedded Digital
  // Twins frame and the Workbench tool list among them. It is recorded here,
  // once for every private page, so a page opened first by a bookmark or a
  // reload does not build an address with no name in it.
  const getAndSetUsername = useGetAndSetUsername();
  useEffect(() => {
    if (routeState === 'authenticated') {
      getAndSetUsername(auth);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeState, auth.user]);

  return renderRouteState(routeState, auth.error, children);
};

export default PrivateRoute;
