import * as React from 'react';
import { render, screen } from '@testing-library/react';
import WorkBench from 'route/workbench/Workbench';

jest.mock('components/Iframe', () => ({
  default: () => <div>iframe-mock</div>,
}));
jest.mock('page/Layout', () => ({
  default: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

describe('Workbench', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('renders Workbench', () => {
    render(<WorkBench />);
    expect(true);
  });

  it('renders components', () => {
    render(<WorkBench />);
    expect(screen.queryByText('iframe-mock')).toBeInTheDocument();
  });
});
