import * as React from 'react';
import WorkBench from 'route/workbench/Workbench';
import LayoutPublic from 'page/LayoutPublic';
import PrivateRoute from 'route/auth/PrivateRoute';
import Library from './route/library/Library';
import DigitalTwins from './route/digitaltwins/DigitalTwins';
import DigitalTwinsPreview from './route/digitaltwins/DigitalTwinsPreview';
import SignIn from './route/auth/Signin';
import Account from './route/auth/Account';

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
];

export default routes;
