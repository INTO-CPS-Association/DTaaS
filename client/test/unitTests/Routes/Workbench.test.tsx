import * as React from 'react';
import { screen } from '@testing-library/react';
import WorkBench from 'route/workbench/Workbench';
import { InitRouteTests } from '../testUtils';

describe('Workbench', () => {
  InitRouteTests(<WorkBench />);

  it('displays buttons', () => {
    const buttons = screen.getByRole('button');
    expect(buttons).toBeInTheDocument();
  });
});
