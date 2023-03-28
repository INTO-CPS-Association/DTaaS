import { render, screen } from '@testing-library/react';
import * as React from 'react';
import Chart from '../../../src/route/history/Chart';

describe('Chart', () => {
  it('renders title', () => {
    render(<Chart />);
    const titleElement = screen.getByText('Observed Output');
    expect(titleElement).toBeInTheDocument();
  });
});
