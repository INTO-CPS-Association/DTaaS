import * as React from 'react';
import { render, screen } from '@testing-library/react';
import Dashboard from 'route/dashboard/Dashboard';

jest.mock('components/Chart', () => ({
  default: () => <div>chart-mock</div>,
}));
jest.mock('components/RecentRuns', () => ({
  default: () => <div>recent-runs-mock</div>,
}));
jest.mock('page/Layout', () => ({
  default: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

describe('Dashboard', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('renders Dashboard', () => {
    render(<Dashboard />);
    expect(true);
  });

  it('renders Chart and RecentRuns components', () => {
    render(<Dashboard />);
    expect(screen.queryByText('chart-mock')).toBeInTheDocument();
    expect(screen.queryByText('recent-runs-mock')).toBeInTheDocument();
  });
});
