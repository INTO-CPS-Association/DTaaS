import * as React from 'react';
import Account from 'route/auth/Account';
import { render, screen } from '@testing-library/react';
import { useAuth } from 'react-oidc-context';

jest.mock('react-oidc-context');

describe('AccountTabs', () => {
  type Profile = {
    preferred_username: string | undefined,
    picture: string | undefined,
    profile: string | undefined,
    groups: string[] | string | undefined
  };

  const mockProfile: Profile = {
    preferred_username: "user1",
    picture: "pfp.jpg",
    profile: "test.com",
    groups: 'group-one'
  };

  function setupTest(groups: string[] | string) {
    mockProfile.groups = groups;
    const mockuser = { profile: mockProfile };
    (useAuth as jest.Mock).mockReturnValue({
      user: mockuser,
    });
    render(
      <Account />
    );
  }

  afterEach(() => {
    jest.clearAllMocks();
  })

  function testStaticElements() {
    const profilePicture = screen.getByTestId('profile-picture');
    expect(profilePicture).toBeInTheDocument();
    expect(profilePicture).toHaveAttribute('src', 'pfp.jpg');

    const username = screen.getAllByText('user1');
    expect(username).not.toBeNull();
    expect(username).toHaveLength(2);

    const profileLink = screen.getByRole('link', { name: /SSO OAuth Provider/i });
    expect(profileLink).toBeInTheDocument();
    expect(profileLink).toHaveAttribute('href', 'test.com');
  }

  test('renders AccountTabs with correct profile information when user is in 0 groups', () => {
    setupTest([]);

    testStaticElements();

    const groupInfo = screen.getByText(/belong to/);
    expect(groupInfo).toHaveProperty('innerHTML', '<b>user1</b> does not belong to any groups.');
  });

  test('renders AccountTabs with correct profile information when user is in 1 group', () => {
    setupTest("group-one");

    testStaticElements();

    const groupInfo = screen.getByText(/belongs to/);
    expect(groupInfo).toHaveProperty('innerHTML', '<b>user1</b> belongs to <b>group-one</b> group.');
  });

  test('renders AccountTabs with correct profile information when user is in 2 groups', () => {
    setupTest(["first-group", "second-group"]);

    testStaticElements();

    const groupInfo = screen.getByText(/belongs to/);
    expect(groupInfo).toHaveProperty('innerHTML', '<b>user1</b> belongs to <b>first-group</b> and <b>second-group</b> groups.');
  });

  test('renders AccountTabs with correct profile information when user is in 3 groups', () => {
    setupTest(["group1", "group2", "group3"]);

    testStaticElements();

    const groupInfo = screen.getByText(/belongs to/);
    expect(groupInfo).toHaveProperty('innerHTML', '<b>user1</b> belongs to <b>group1</b>, <b>group2</b> and <b>group3</b> groups.');
  });

  test('renders AccountTabs with correct profile information when user is in more than 3 groups', () => {
    setupTest(["g1", "g2", "g3", "g4", "g5"]);

    testStaticElements();

    const groupInfo = screen.getByText(/belongs to/);
    expect(groupInfo).toHaveProperty('innerHTML', '<b>user1</b> belongs to <b>g1</b>, <b>g2</b>, <b>g3</b>, <b>g4</b> and <b>g5</b> groups.');
  });
});