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
import extensionHost from 'extension/extensionHost';
import ExtensionPage from 'extension/ExtensionPage';

/**
 * The pages of the domain extensions in `src/extensions.ts`, mounted under
 * each extension's id. They are private pages like the core ones, and each is
 * loaded on demand, so a renderer or a WebAssembly kernel an extension needs
 * stays out of the entry chunk.
 */
const extensionRoutes = extensionHost.routes.map(
  ({ extension, path, element }) => ({
    path,
    element: (
      <PrivateRoute>
        <ExtensionPage extension={extension} page={element} />
      </PrivateRoute>
    ),
  }),
);

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
        <InsightsConfig role="user" />
      </PrivateRoute>
    ),
  },
  {
    path: 'insights/developer',
    element: (
      <PrivateRoute>
        <InsightsConfig role="developer" />
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
  ...extensionRoutes,
  // Anything the list above does not match. Without it the router falls back
  // to its own developer-facing error screen.
  {
    path: '*',
    element: <NotFound />,
  },
];

export default routes;
