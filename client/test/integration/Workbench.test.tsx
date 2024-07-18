import * as React from 'react';
import { cleanup, screen, within } from '@testing-library/react';
import Workbench from 'route/workbench/Workbench';
import { useAuth } from 'react-oidc-context';
import { useSelector } from 'react-redux';
import { RootState } from 'store/store';
import {
  closestDiv,
  renderWithMemoryRouter,
  testFooter,
  testMenu,
} from './integrationTestUtils';

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
  beforeEach(() => {
    (useAuth as jest.Mock).mockReturnValue({ user: {} });
    (useSelector as jest.Mock).mockImplementation(
      (selector: (state: RootState) => object) =>
        selector({
          menu: { isOpen: false },
          auth: { userName: '' },
        }),
    );
    renderWithMemoryRouter(<Workbench />);
  });

  it('renders the Workbench and Layout correctly', () => {
    cleanup();
    const { container } = renderWithMemoryRouter(<Workbench />);

    // Testing toolbar without buttons
    const toolbar = container.getElementsByClassName(
      'MuiToolbar-root MuiToolbar-gutters MuiToolbar-regular',
    )[0];
    expect(toolbar).toBeInTheDocument();

    testMenu();
    testFooter();

    const mainHeading = screen.getByRole('heading', { level: 4 });
    expect(mainHeading).toBeInTheDocument();
    expect(mainHeading).toHaveTextContent(/Workbench Tools/);

    const workHeadingDiv = closestDiv(mainHeading);

    const workbenchToolsButtons = within(workHeadingDiv).getByRole('button');
    expect(workbenchToolsButtons).toBeInTheDocument();
  });
});
