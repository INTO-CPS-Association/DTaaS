import * as React from 'react';
import { render, screen, within } from '@testing-library/react';
import WorkBench from 'route/workbench/Workbench';
import { itHasAllLayoutTestIds } from './integrationTestUtils';

jest.mock('page/Layout', () => ({
  ...jest.requireActual('page/Layout'),
}));

describe('Library', () => {
  beforeEach(() => {
    render(<WorkBench />);
  });

  it('renders the Workbench and Layout correctly', () => {
    itHasAllLayoutTestIds();

    const mainHeading = screen.getByRole('heading', { level: 4 });
    expect(mainHeading).toBeInTheDocument();
    expect(mainHeading).toHaveTextContent(/Workbench Tools/);

    const workHeadingDiv = mainHeading.closest('div');
    expect(workHeadingDiv).toBeInTheDocument();

    const workbenchToolsButtons = within(workHeadingDiv!).getByRole('button');
    expect(workbenchToolsButtons).toBeInTheDocument();
  });
});
