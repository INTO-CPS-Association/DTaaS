import * as React from 'react';
import Dashboard from 'route/dashboard/Dashboard';
import { InitRouteTests, itDisplaysMocks } from '../testUtils';

describe('Dashboard', () => {
  InitRouteTests(<Dashboard />);

  itDisplaysMocks(['chart-mock', 'recent-runs-mock']);
});
