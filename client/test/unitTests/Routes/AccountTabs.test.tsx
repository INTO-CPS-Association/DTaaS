import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AccountTabs from 'route/auth/AccountTabs';
import { useAuth } from 'react-oidc-context';

jest.mock('react-oidc-context');

describe('AccountTabs', () => {
    const mockprofile={
        preferred_username: "user1",
        picture: "pfp.jpg",
        profile: "test.com",
        groups_direct:["group1", "group2"]
    };

    const mockuser={profile: mockprofile};

  test('renders AccountTabs with correct profile information', () => {
    (useAuth as jest.Mock).mockReturnValue({
        user: mockuser,
      });

    render(
      <MemoryRouter>
        <AccountTabs />
      </MemoryRouter>
    );

    const profilePicture = screen.getByTestId('profile-picture');
    expect(profilePicture).toBeInTheDocument();
    expect(profilePicture).toHaveAttribute('src', 'pfp.jpg');

    const username = screen.getByText('user1');
    expect(username).toBeInTheDocument();

    const profileLink = screen.getByRole('link', { name: /SSO OAuth Provider/i });
    expect(profileLink).toBeInTheDocument();
    expect(profileLink).toHaveAttribute('href', 'test.com');

    const groupInfo = screen.getByText('user1 belongs to 2 groups.');
    expect(groupInfo).toBeInTheDocument();

    jest.clearAllMocks();
  });

  test('renders AccountTabs with correct profile information when user is not part of a group', () => {
    mockuser.profile.groups_direct=[];
    (useAuth as jest.Mock).mockReturnValue({
        user: mockuser,
      });

    render(
      <MemoryRouter>
        <AccountTabs />
      </MemoryRouter>
    );

    const profilePicture = screen.getByTestId('profile-picture');
    expect(profilePicture).toBeInTheDocument();
    expect(profilePicture).toHaveAttribute('src', 'pfp.jpg');

    const username = screen.getByText('user1');
    expect(username).toBeInTheDocument();

    const profileLink = screen.getByRole('link', { name: /SSO OAuth Provider/i });
    expect(profileLink).toBeInTheDocument();
    expect(profileLink).toHaveAttribute('href', 'test.com');

    
    const groupInfo = screen.queryByText(/user1 belongs to \d+ groups?/i);
    expect(groupInfo).not.toBeInTheDocument();
  
    jest.clearAllMocks();
  });

});