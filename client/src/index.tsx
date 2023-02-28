import '@fontsource/roboto';
import React from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import Layout from 'page/Layout';
import ReactDOM from 'react-dom/client';
import WorkBench from 'route/workbench/Workbench';
import Dashboard from './route/dashboard/Dashboard';
import Library from './route/library/Library';
import DigitalTwins from './route/digitaltwins/DigitalTwins';
import ScenarioAnalysis from './route/scenarioAnalysis/ScenarioAnalysis';
import DTHistory from './route/history/History';
import SignIn from './route/auth/Signin';
import Account from './route/auth/Account';

const router = createBrowserRouter([
  {
    path: '/',
    element: <SignIn />,
  },
  {
    path: 'dashboard',
    element: <Layout><Dashboard /></Layout>,
  },
  {
    path: 'library',
    element: <Layout><Library /></Layout>,
  },
  {
    path: 'digitaltwins',
    element: <Layout><DigitalTwins /></Layout>,
  },
  {
    path: 'sanalysis',
    element: <Layout><ScenarioAnalysis /></Layout>,
  },
  {
    path: 'history',
    element: <Layout><DTHistory /></Layout>,
  },
  {
    path: 'account',
    element: <Layout><Account /></Layout>,
  },
  {
    path: 'workbench',
    element: <Layout><WorkBench/></Layout>,
  },
  {
    path: '*',
    element: <Layout><h1>404 - Page not found...</h1></Layout>,
  }
]);

// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
const root = ReactDOM.createRoot(document.getElementById('root')!);

root.render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);
