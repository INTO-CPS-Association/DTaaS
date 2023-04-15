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
      <PrivateRoute useDummyAuth={true}>
        <Dashboard />
      </PrivateRoute>
    ),
  },
  {
    path: 'library',
    element: (
      <PrivateRoute useDummyAuth={true}>
        <Library />
      </PrivateRoute>
    ),
  },
  {
    path: 'digitaltwins',
    element: (
      <PrivateRoute useDummyAuth={true}>
        <DigitalTwins />
      </PrivateRoute>
    ),
  },
  {
    path: 'sanalysis',
    element: (
      <PrivateRoute useDummyAuth={true}>
        <ScenarioAnalysis />
      </PrivateRoute>
    ),
  },
  {
    path: 'history',
    element: (
      <PrivateRoute useDummyAuth={true}>
        <DTHistory />
      </PrivateRoute>
    ),
  },
  {
    path: 'account',
    element: (
      <PrivateRoute useDummyAuth={true}>
        <Account />
      </PrivateRoute>
    ),
  },
  {
    path: 'workbench',
    element: (
      <PrivateRoute useDummyAuth={true}>
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
