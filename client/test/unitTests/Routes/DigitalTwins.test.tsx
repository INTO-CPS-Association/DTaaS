import * as React from 'react';
import { render, screen } from '@testing-library/react';
import DigitalTwins from 'route/digitaltwins/DigitalTwins';

jest.mock('route/digitaltwins/Workflows', () => ({
  default: () => <div>workflows-mock</div>,
}));
jest.mock('page/Layout', () => ({
  default: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

describe('Digital Twins', () => {
  it('reder DigitalTwin', () => {
    render(<DigitalTwins />);
    expect(true);
  });

  it('renders Dashboard woth components', () => {
    render(<DigitalTwins />);
    expect(screen.queryByText('workflows-mock')).toBeInTheDocument();
  });
});
