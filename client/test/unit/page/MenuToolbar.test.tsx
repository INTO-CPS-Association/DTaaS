/**
 * Tests for signing out from the toolbar.
 *
 * The integration suite opens the settings menu and asserts that the Logout
 * item is there, and stops short of pressing it, because the real sign-out flow
 * redirects. These press it against a stand-in for that flow, so the handler
 * between the menu item and the flow is exercised without leaving the page.
 */

import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { useAuth } from 'react-oidc-context';
import { useSignOut } from 'util/auth/Authentication';
import MenuToolbar from 'page/MenuToolbar';

// test/__mocks__/unit/page_mocks.tsx replaces the MUI Toolbar with an empty div
// for every unit test, so nothing inside the bar renders. This file is about
// what is inside it, so it takes the real one back.
jest.mock('@mui/material/Toolbar', () =>
  jest.requireActual('@mui/material/Toolbar'),
);

jest.mock('react-oidc-context', () => ({
  useAuth: jest.fn(),
}));

jest.mock('util/auth/Authentication', () => ({
  useSignOut: jest.fn(),
}));

const signOut = jest.fn();
const auth = { user: { profile: { preferred_username: 'jane' } } };

const renderToolbar = () => {
  // The menu is portalled into the element the application mounts into, so the
  // test DOM has to carry it or the menu renders nowhere.
  const root = document.createElement('div');
  root.id = 'root';
  document.body.appendChild(root);

  const anchor = document.createElement('div');
  document.body.appendChild(anchor);

  render(
    <MemoryRouter>
      <MenuToolbar
        open={false}
        drawerwidth={240}
        handleCloseUserMenu={jest.fn()}
        handleOpenUserMenu={jest.fn()}
        handleDrawerOpen={jest.fn()}
        anchorElUser={anchor}
      />
    </MemoryRouter>,
  );
};

describe('MenuToolbar Sign Out', () => {
  beforeEach(() => {
    signOut.mockReset().mockResolvedValue(undefined);
    (useSignOut as jest.Mock).mockReturnValue(signOut);
    (useAuth as jest.Mock).mockReturnValue(auth);
  });

  it('Signs the user out with the current session when Logout is pressed', async () => {
    renderToolbar();

    await userEvent.click(screen.getByRole('menuitem', { name: /Logout/ }));

    // The session is what the flow needs, so it is what the handler passes on.
    expect(signOut).toHaveBeenCalledWith(auth);
  });

  it('Does nothing when there is no session to end', async () => {
    // useAuth returns undefined outside a provider, which is how several tests
    // render this toolbar. Pressing Logout there must not reach the flow.
    (useAuth as jest.Mock).mockReturnValue(undefined);
    renderToolbar();

    await userEvent.click(screen.getByRole('menuitem', { name: /Logout/ }));

    expect(signOut).not.toHaveBeenCalled();
  });
});
