import { screen } from '@testing-library/react';
import WorkBench from 'route/workbench/Workbench';
import { InitRouteTests } from 'test/unit/unit.testUtil';
import { useSelector, useDispatch } from 'react-redux';

describe('Workbench', () => {
  const mockDispatch = jest.fn();

  beforeEach(() => {
    (useDispatch as jest.MockedFunction<typeof useDispatch>).mockReturnValue(
      mockDispatch,
    );
    (useSelector as jest.MockedFunction<typeof useSelector>).mockImplementation(
      (selector: (state: object) => unknown) =>
        selector({
          auth: { userName: 'username' },
          workbench: { status: 'succeeded', services: {} },
        }),
    );
  });

  InitRouteTests(<WorkBench />);

  it('displays buttons', () => {
    const buttons = screen.getByRole('button');
    expect(buttons).toBeInTheDocument();
  });
});
