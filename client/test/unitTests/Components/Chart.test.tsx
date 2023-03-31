import { render, screen } from '@testing-library/react';
import * as React from 'react';
import Chart from 'components/Chart';

jest.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  LineChart: () => <div>LineChart-mock</div>,
}));

jest.mock('page/Title', () => ({
  default: () => <h1>Observed Output</h1>,
}));

describe('Chart', () => {
  beforeAll(() => {
    // Supress console.error messages. This is a hack to avoid errors from
    // recharts. Rechart is being mocked, so it should not be throwing errors.
    jest.spyOn(console, 'error').mockImplementation();
  });

  it('renders title', () => {
    render(<Chart />);
    const titleElement = screen.getByText('Observed Output');
    expect(titleElement).toBeInTheDocument();
  });

  it('renders linechart', () => {
    render(<Chart />);
    const linechart = screen.getByText('LineChart-mock');
    expect(linechart).toBeInTheDocument();
  });
});
