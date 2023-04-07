import '@fontsource/roboto';
import * as React from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import ReactDOM from 'react-dom/client';
import WorkBench from 'route/workbench/Workbench';
import AppProvider from 'AppProvider';
import Library from './route/library/Library';
import DigitalTwins from './route/digitaltwins/DigitalTwins';
import Account from './route/auth/Account';

const router = createBrowserRouter([
  {
    path: '/',
    element: <Library />,
  },
  {
    path: '/library',
    element: <Library />,
  },
  {
    path: 'digitaltwins',
    element: <DigitalTwins />,
  },
  {
    path: 'account',
    element: <Account />,
  },
  {
    path: 'workbench',
    element: <WorkBench />,
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
