/**
 * Tests for the account tabs when the provider supplies no user.
 *
 * The integration suite renders these tabs through the route, which only ever
 * reaches them with somebody signed in. These render them directly, because the
 * components declare that the user may be absent: `useAuth().user` is typed
 * `User | null | undefined` by react-oidc-context, and every read of a claim
 * here is written as an optional chain because of it. That is the contract the
 * components state, and it is what these check. A component does not know which
 * route guard sits above it.
 */

import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { useAuth } from 'react-oidc-context';
import tabs from 'route/account/AccountTabData';

jest.mock('react-oidc-context', () => ({
  useAuth: jest.fn(),
}));

// The settings form reads the store, which is not what these tests are about.
jest.mock('route/account/SettingsForm', () => ({
  __esModule: true,
  default: () => <div data-testid="settings-form" />,
}));

const [profileTab, settingsTab] = tabs;

const renderTab = (body: React.ReactNode) =>
  render(<MemoryRouter>{body}</MemoryRouter>);

describe('the account tabs with no signed-in user', () => {
  beforeEach(() => {
    (useAuth as jest.Mock).mockReturnValue({ user: null });
  });

  it('renders the profile tab instead of throwing', () => {
    renderTab(profileTab.body);

    expect(
      screen.getByRole('heading', { level: 2, name: 'Profile' }),
    ).toBeInTheDocument();
  });

  it('names no user, and offers no profile link, when there are no claims', () => {
    renderTab(profileTab.body);

    // Every claim is absent, so the resolvers return nothing: no name, no
    // picture and no link to a page that does not exist.
    expect(
      screen.getByText(/Your OAuth provider did not expose a profile URL\./),
    ).toBeInTheDocument();
    expect(screen.queryByRole('link')).toBeNull();
    expect(screen.getByTestId('profile-picture')).not.toHaveAttribute('src');
  });

  it('says the user belongs to no groups when there are no groups', () => {
    renderTab(profileTab.body);

    expect(
      screen.getByText(/does not belong to any groups/),
    ).toBeInTheDocument();
  });

  it('renders the settings tab, and names where the profile is edited', () => {
    renderTab(settingsTab.body);

    expect(
      screen.getByRole('heading', { level: 2, name: 'Settings' }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/your SSO OAuth Provider account page\./),
    ).toBeInTheDocument();
    expect(screen.getByTestId('settings-form')).toBeInTheDocument();
  });
});
