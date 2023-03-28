import { render, screen } from '@testing-library/react';
import * as React from 'react';
import DTHistory from 'route/history/History';

jest.mock('route/history/RecentRuns', () => ({
  default: () => <div>RecentRuns-mock</div>,
}));
jest.mock('route/history/Logs', () => ({
  default: () => <div>Logs-mock</div>,
}));
jest.mock('page/Layout', () => ({
  default: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

describe('DTHistory', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('renders RecentRuns and Logs components', () => {
    render(<DTHistory />);
    expect(screen.queryByText('RecentRuns-mock')).toBeInTheDocument();
    expect(screen.queryByText('Logs-mock')).toBeInTheDocument();
  });
});
