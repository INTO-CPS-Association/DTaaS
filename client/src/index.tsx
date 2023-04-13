import '@fontsource/roboto';
import * as React from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import ReactDOM from 'react-dom/client';
import WorkBench from 'route/workbench/Workbench';
import AppProvider from 'AppProvider';
import Dashboard from './route/dashboard/Dashboard';
import Library from './route/library/Library';
import DigitalTwins from './route/digitaltwins/DigitalTwins';
import ScenarioAnalysis from './route/scenarioAnalysis/ScenarioAnalysis';
import DTHistory from './route/history/History';
import SignIn from './route/auth/Signin';
import Account from './route/auth/Account';

import PrivateRoute from '../src/components/PrivateRoute';

const router = createBrowserRouter([
  {
    path: '/',
    element: <SignIn />,
  },
  {
    path: 'dashboard',
    element: (
      <PrivateRoute waitForAuthCheck={true} delayAuthCheck={10}>
        <Dashboard />
      </PrivateRoute>
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
    path: 'sanalysis',
    element: (
      <PrivateRoute>
        <ScenarioAnalysis />
      </PrivateRoute>
    ),
  },
  {
    path: 'history',
    element: (
      <PrivateRoute>
        <DTHistory />
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
]);

// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
const root = ReactDOM.createRoot(document.getElementById('root')!);

root.render(
  <React.StrictMode>
    <AppProvider>
      <RouterProvider router={router} />
    </AppProvider>
  </React.StrictMode>
);