import * as React from 'react';
import { render, screen } from '@testing-library/react';
import ScenarioAnalysis from 'route/scenarioAnalysis/ScenarioAnalysis';

jest.mock('route/scenarioAnalysis/Workflows', () => ({
  default: () => <div>workflows-mock</div>,
}));

jest.mock('page/Layout', () => ({
  default: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

describe('ScenarioAnalysis', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('renders ScenarioAnalysis', () => {
    render(<ScenarioAnalysis />);
    expect(true);
  });

  it('renders components', () => {
    render(<ScenarioAnalysis />);
    expect(screen.queryByText('workflows-mock')).toBeInTheDocument();
  });
});
