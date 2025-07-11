import * as React from 'react';
import Account from 'route/auth/Account';
import { render, screen } from '@testing-library/react';
import { useAuth } from 'react-oidc-context';
import { mockUser } from 'test/__mocks__/global_mocks';
import {
  testAccountSettings,
  testStaticAccountProfile,
} from 'test/unit/unit.testUtil';

jest.mock('components/tab/TabComponent', () => ({
  ...jest.requireActual('components/tab/TabComponent'),
}));

jest.mock('react-oidc-context');

describe('AccountTabs', () => {
  let accountMockUser = mockUser;
  function setupTest(groups: string[] | string) {
    accountMockUser.profile.groups = groups;
    (useAuth as jest.Mock).mockReturnValue({
      user: accountMockUser,
    });
    render(<Account />);
  }

  afterEach(() => {
    jest.clearAllMocks();
    accountMockUser = mockUser;
  });

  test('renders the Settings tab correctly', async () => {
    setupTest([]);
    await testAccountSettings(accountMockUser);
  });

  test('renders AccountTabs with correct profile information when user is in 0 groups', () => {
    setupTest([]);
    testStaticAccountProfile(accountMockUser);

    const groupInfo = screen.getByText(/belong to/);
    expect(groupInfo).toHaveProperty(
      'innerHTML',
      '<b>username</b> does not belong to any groups.',
    );
  });

  test('renders AccountTabs with correct profile information when user is in 1 group', () => {
    setupTest('group-one');
    testStaticAccountProfile(accountMockUser);

    const groupInfo = screen.getByText(/belongs to/);
    expect(groupInfo).toHaveProperty(
      'innerHTML',
      '<b>username</b> belongs to <b>group-one</b> group.',
    );
  });

  test('renders AccountTabs with correct profile information when user is in 2 groups', () => {
    setupTest(['first-group', 'second-group']);
    testStaticAccountProfile(accountMockUser);

    const groupInfo = screen.getByText(/belongs to/);
    expect(groupInfo).toHaveProperty(
      'innerHTML',
      '<b>username</b> belongs to <b>first-group</b> and <b>second-group</b> groups.',
    );
  });

  test('renders AccountTabs with correct profile information when user is in 3 groups', () => {
    setupTest(['group1', 'group2', 'group3']);

    testStaticAccountProfile(accountMockUser);

    const groupInfo = screen.getByText(/belongs to/);
    expect(groupInfo).toHaveProperty(
      'innerHTML',
      '<b>username</b> belongs to <b>group1</b>, <b>group2</b> and <b>group3</b> groups.',
    );
  });

  test('renders AccountTabs with correct profile information when user is in more than 3 groups', () => {
    setupTest(['g1', 'g2', 'g3', 'g4', 'g5']);

    testStaticAccountProfile(accountMockUser);

    const groupInfo = screen.getByText(/belongs to/);
    expect(groupInfo).toHaveProperty(
      'innerHTML',
      '<b>username</b> belongs to <b>g1</b>, <b>g2</b>, <b>g3</b>, <b>g4</b> and <b>g5</b> groups.',
    );
  });
});
