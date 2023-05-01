import '@fontsource/roboto';
import * as React from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import ReactDOM from 'react-dom/client';
import WorkBench from 'route/workbench/Workbench';
import AppProvider from 'AppProvider';
import { useURLbasename } from 'util/envUtil';
import LayoutPublic from 'page/LayoutPublic';
import Library from './route/library/Library';
import DigitalTwins from './route/digitaltwins/DigitalTwins';
import SignIn from './route/auth/Signin';
import Account from './route/auth/Account';

import PrivateRoute from '../src/components/PrivateRoute';
import AuthProvider from './util/auth/AuthProvider';

const router = createBrowserRouter(
  [
    {
      path: '/',
      element: (
        <LayoutPublic>
          <SignIn />
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
  ],
  {
    basename: `/${useURLbasename()}`,
  }
);

const root = document.getElementById('root');

if (root) {
  ReactDOM.createRoot(root).render(
    <React.StrictMode>
      <AppProvider>
        <AuthProvider>
          <RouterProvider router={router} />
        </AuthProvider>
      </AppProvider>
    </React.StrictMode>
  );
} else {
  throw Error("Couldn't find root element");
}
