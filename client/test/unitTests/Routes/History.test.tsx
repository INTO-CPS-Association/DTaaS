import * as React from 'react';
import DTHistory from 'route/history/History';
import { InitRouteTests, itDisplaysMocks } from '../testUtils';

describe('DTHistory', () => {
  InitRouteTests(<DTHistory />);

  itDisplaysMocks(['recent-runs-mock', 'Logs-mock']);
});
