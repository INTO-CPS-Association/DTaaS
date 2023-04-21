import * as React from 'react';

jest.mock('components/Chart', () => ({
  default: () => <div>chart-mock</div>,
}));

jest.mock('components/RecentRuns', () => ({
  default: () => <div>recent-runs-mock</div>,
}));

jest.mock('route/history/Logs', () => ({
  default: () => <div>Logs-mock</div>,
}));
