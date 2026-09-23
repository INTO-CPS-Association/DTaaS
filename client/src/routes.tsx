import { Suspense, lazy } from 'react';
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

/**
 * The only route loaded on demand.
 *
 * Building Models pulls in a renderer and a WebAssembly geometry kernel, which
 * together are larger than the rest of the application. Loading it lazily is
 * stated here, at the route, instead of being left to whatever the package does
 * internally, where it would regress silently on a version bump.
 */
const Bim = lazy(() => import('route/bim/Bim'));

export const routes = [
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
    element: (
      <PrivateRoute>
        <Library />
      </PrivateRoute>
    ),
  },
  {
    path: 'digitaltwins',
    element: (
      <PrivateRoute>
        <DigitalTwins />
      </PrivateRoute>
    ),
  },
  {
    path: 'automation',
    element: (
      <PrivateRoute>
        <Automation />
      </PrivateRoute>
    ),
  },
  {
    path: 'bim',
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
    element: (
      <PrivateRoute>
        <Account />
      </PrivateRoute>
    ),
  },
  {
    path: 'workbench',
    element: (
      <PrivateRoute>
        <WorkBench />
      </PrivateRoute>
    ),
  },
  {
    path: 'preview/digitaltwins',
    element: (
      <PrivateRoute>
        <DigitalTwinsPreview />
      </PrivateRoute>
    ),
  },
  {
    path: 'preview/library',
    element: (
      <PrivateRoute>
        <LibraryPreview />
      </PrivateRoute>
    ),
  },
  {
    path: 'insights/measure',
    element: (
      <PrivateRoute>
        <Measurement />
      </PrivateRoute>
    ),
  },
  {
    path: 'insights',
    element: (
      <PrivateRoute>
        <Insights />
      </PrivateRoute>
    ),
  },
  {
    path: 'insights/config',
    element: (
      <PrivateRoute>
        <InsightsConfig />
      </PrivateRoute>
    ),
  },
  {
    path: 'insights/log',
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

export default routes;
