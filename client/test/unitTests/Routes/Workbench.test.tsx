import * as React from 'react';
import { render, screen } from '@testing-library/react';
import WorkBench from 'route/workbench/Workbench';
import { mockURLforWorkbench } from '../__mocks__/global_mocks';

describe('Workbench', () => {
  beforeEach(() => {
    render(<WorkBench />);
  });

  it('renders Workbench', () => {
    expect(true);
  });

  it('renders iframe with correct title and URL', () => {
    const iframe = screen.queryByTitle('sandbox', { exact: false });
    expect(iframe).toBeInTheDocument();
    expect(iframe).toHaveAttribute('src', mockURLforWorkbench);
  });
});
