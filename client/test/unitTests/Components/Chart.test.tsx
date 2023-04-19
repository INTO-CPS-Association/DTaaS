import { render } from '@testing-library/react';
import * as React from 'react';
import Chart from 'components/Chart';
import { itDisplaysMocks } from '../testUtils';

jest.mock('components/Chart', () => ({
  default: jest.requireActual('components/Chart').default,
}));

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
  beforeEach(() => {
    // Supress console.error messages. This is a hack to avoid errors from
    // recharts. Rechart is being mocked, so it should not be throwing errors.
    jest.spyOn(console, 'error').mockImplementation();
    render(<Chart />);
  });

  itDisplaysMocks(['LineChart-mock', 'Observed Output']);
});
