import * as React from 'react';
import { render, screen } from '@testing-library/react';
import DigitalTwins from '../src/route/digitaltwins/DigitalTwins';

jest.mock('route/digitaltwins/Workflows', () => ({
  default: () => <div>workflows-mock</div>,
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
