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
