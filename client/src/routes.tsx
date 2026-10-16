import { ReactNode, Suspense, lazy } from 'react';
import CircularProgress from '@mui/material/CircularProgress';
import WorkBench from 'route/workbench/Workbench';
import LayoutPublic from 'page/LayoutPublic';
import PrivateRoute from 'route/auth/PrivateRoute';
import LibraryPreview from 'route/library/cart/LibraryPreview';
import Library from 'route/library/Library';
import DigitalTwins from 'route/digitaltwins/DigitalTwins';
import DigitalTwinsPreview from 'route/digitaltwins/DigitalTwinsPreview';
import SignIn from 'route/auth/Signin';
import Account from 'route/account/Account';
import Config from 'route/config/Config';
import Measurement from 'route/measurement/Measurement';
import LogViewer from 'page/LogViewer';
import NotFound from 'page/NotFound';
import Automation from 'route/automation/Automation';
import Insights from 'route/insights/Insights';
import InsightsConfig from 'route/insights/InsightsConfig';
import { Feature, Profile, getProfile, isFeatureEnabled } from 'util/profile';

/**
 * The only route loaded on demand.
 *
 * Building Models pulls in a renderer and a WebAssembly geometry kernel, which
 * together are larger than the rest of the application. Loading it lazily is
 * stated here, at the route, instead of being left to whatever the package does
 * internally, where it would regress silently on a version bump.
 */
const Bim = lazy(() => import('route/bim/Bim'));

/**
 * A route, and the feature it belongs to. Routes without a feature, the sign
 * in page, the configuration check and the catch-all, are in every profile.
 */
interface AppRoute {
  path: string;
  element: ReactNode;
  feature?: Feature;
}

/** A route as the router takes it. */
export type RouteEntry = Pick<AppRoute, 'path' | 'element'>;

const allRoutes: AppRoute[] = [
  {
    path: '/',
    element: (
      <LayoutPublic>
        <SignIn />
      </LayoutPublic>
    ),
  },
  {
    path: 'config/developer',
    element: (
      <LayoutPublic containerMaxWidth="md">
        <Config role="developer" />
      </LayoutPublic>
    ),
  },
  {
    path: 'config/user',
    element: (
      <LayoutPublic containerMaxWidth="md">
        <Config role="user" />
      </LayoutPublic>
    ),
  },
  {
    path: 'library',
    feature: 'library',
    element: (
      <PrivateRoute>
        <Library />
      </PrivateRoute>
    ),
  },
  {
    path: 'digitaltwins',
    feature: 'digitaltwins',
    element: (
      <PrivateRoute>
        <DigitalTwins />
      </PrivateRoute>
    ),
  },
  {
    path: 'automation',
    feature: 'automation',
    element: (
      <PrivateRoute>
        <Automation />
      </PrivateRoute>
    ),
  },
  {
    path: 'bim',
    feature: 'bim',
    element: (
      <PrivateRoute>
        {/* The fallback is what a person sees while the renderer downloads. */}
        <Suspense fallback={<CircularProgress sx={{ m: 4 }} />}>
          <Bim />
        </Suspense>
      </PrivateRoute>
    ),
  },
  {
    path: 'account',
    feature: 'account',
    element: (
      <PrivateRoute>
        <Account />
      </PrivateRoute>
    ),
  },
  {
    path: 'workbench',
    feature: 'workbench',
    element: (
      <PrivateRoute>
        <WorkBench />
      </PrivateRoute>
    ),
  },
  {
    path: 'preview/digitaltwins',
    feature: 'digitaltwins',
    element: (
      <PrivateRoute>
        <DigitalTwinsPreview />
      </PrivateRoute>
    ),
  },
  {
    path: 'preview/library',
    feature: 'library',
    element: (
      <PrivateRoute>
        <LibraryPreview />
      </PrivateRoute>
    ),
  },
  {
    path: 'insights/measure',
    feature: 'insights',
    element: (
      <PrivateRoute>
        <Measurement />
      </PrivateRoute>
    ),
  },
  {
    path: 'insights',
    feature: 'insights',
    element: (
      <PrivateRoute>
        <Insights />
      </PrivateRoute>
    ),
  },
  {
    path: 'insights/config',
    feature: 'insights',
    element: (
      <PrivateRoute>
        <InsightsConfig role="user" />
      </PrivateRoute>
    ),
  },
  {
    path: 'insights/developer',
    feature: 'insights',
    element: (
      <PrivateRoute>
        <InsightsConfig role="developer" />
      </PrivateRoute>
    ),
  },
  {
    path: 'insights/log',
    feature: 'insights',
    element: (
      <PrivateRoute>
        <LogViewer />
      </PrivateRoute>
    ),
  },
  // Anything the list above does not match. Without it the router falls back
  // to its own developer-facing error screen.
  {
    path: '*',
    element: <NotFound />,
  },
];

/**
 * The routes a profile offers, in their original order, so the catch-all
 * stays last. An address whose feature is off falls through to it.
 */
export function routesFor(profile: Profile): RouteEntry[] {
  return allRoutes
    .filter(({ feature }) => !feature || isFeatureEnabled(feature, profile))
    .map(({ path, element }) => ({ path, element }));
}

export const routes = routesFor(getProfile());

export default routes;
