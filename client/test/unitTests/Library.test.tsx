import * as React from 'react';
import { render, screen } from '@testing-library/react';
import Library from 'route/library/Library';

jest.mock('../src/route/library/Components', () => ({
  default: () => <div>LibComponents-mock</div>,
}));

describe('Library with no props', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    render(<Library />);
  });

  it('renders Library', () => {
    expect(true);
  });

  it('renders LibComponents', () => {
    expect(screen.queryByText('LibComponents-mock')).toBeInTheDocument();
  });
});
