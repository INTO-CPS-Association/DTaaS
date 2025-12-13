import { screen } from '@testing-library/react';
import WorkBench from 'route/workbench/Workbench';
import { InitRouteTests } from 'test/unit/unit.testUtil';

describe('Workbench', () => {
  InitRouteTests(<WorkBench />);

  it('displays buttons', () => {
    const buttons = screen.getByRole('button');
    expect(buttons).toBeInTheDocument();
  });
});
