import * as React from 'react';
import { cleanup, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Workbench from 'route/workbench/Workbench';
import { useAuth } from 'react-oidc-context';
import { useSelector } from 'react-redux';
import { RootState } from 'store/store';
import { testFooter, testMenu, testToolbar } from './integrationTestUtils';

jest.mock('page/Layout', () => ({
  ...jest.requireActual('page/Layout'),
}));

jest.mock('page/Footer', () => ({
  ...jest.requireActual('page/Footer'),
}));

jest.mock('@mui/material/Toolbar', () => ({
  ...jest.requireActual('@mui/material/Toolbar'),
}));

jest.mock('page/Menu', () => ({
  ...jest.requireActual('page/Menu'),
}));

jest.mock('react-oidc-context', () => ({
  useAuth: jest.fn(),
}));

jest.mock('../../src/util/auth/Authentication', () => ({
  getAndSetUsername: jest.fn(),
}));

describe('Workbench', () => {
  const uiToRender = (
    <MemoryRouter>
      <Workbench />
    </MemoryRouter>
  );
  beforeEach(() => {
    (useAuth as jest.Mock).mockReturnValue({ user: {} });
    (useSelector as jest.Mock).mockImplementation(
      (selector: (state: RootState) => object) =>
        selector({
          menu: { isOpen: false },
          auth: { userName: '' },
        }),
    );
    render(uiToRender);
  });

  it('renders the Workbench and Layout correctly', () => {
    cleanup();
    const { container } = render(uiToRender);

    testMenu();
    testToolbar(container);
    testFooter();

    const mainHeading = screen.getByRole('heading', { level: 4 });
    expect(mainHeading).toBeInTheDocument();
    expect(mainHeading).toHaveTextContent(/Workbench Tools/);

    const workHeadingDiv = mainHeading.closest('div');
    expect(workHeadingDiv).toBeInTheDocument();

    const workbenchToolsButtons = within(workHeadingDiv!).getByRole('button');
    expect(workbenchToolsButtons).toBeInTheDocument();
  });
});
