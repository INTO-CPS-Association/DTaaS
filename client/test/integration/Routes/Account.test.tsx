import { screen } from '@testing-library/react';
import {
  testAccountSettings,
  testStaticAccountProfile,
} from 'test/unit/unit.testUtil';
import {
  mockAuthState,
  mockUser,
  mockUserType,
} from 'test/__mocks__/global_mocks';
import { setupIntegrationTest } from 'test/integration/integration.testUtil';
import { testLayout } from './routes.testUtil';

const setup = async (user: mockUserType) =>
  setupIntegrationTest('/account', { ...mockAuthState, user });

describe('Account', () => {
  it('renders the Account page and Layout correctly', async () => {
    await setup(mockUser);
    await testLayout();
    testStaticAccountProfile(mockUser);
    await testAccountSettings(mockUser);
  }, 15000);

  it('renders the Account page with different amounts of groups', async () => {
    await setup({ ...mockUser, profile: { ...mockUser.profile, groups: [] } });
    expect(screen.getByText(/belong to/)).toHaveProperty(
      'innerHTML',
      '<b>username</b> does not belong to any groups.',
    );

    await setup({
      ...mockUser,
      profile: { ...mockUser.profile, groups: ['g1'] },
    });
    expect(screen.getByText(/belongs to/)).toHaveProperty(
      'innerHTML',
      '<b>username</b> belongs to <b>g1</b> group.',
    );

    await setup({
      ...mockUser,
      profile: { ...mockUser.profile, groups: ['g1', 'g2'] },
    });
    expect(screen.getByText(/belongs to/)).toHaveProperty(
      'innerHTML',
      '<b>username</b> belongs to <b>g1</b> and <b>g2</b> groups.',
    );

    await setup({
      ...mockUser,
      profile: { ...mockUser.profile, groups: ['g1', 'g2', 'g3'] },
    });
    expect(screen.getByText(/belongs to/)).toHaveProperty(
      'innerHTML',
      '<b>username</b> belongs to <b>g1</b>, <b>g2</b> and <b>g3</b> groups.',
    );

    await setup({
      ...mockUser,
      profile: { ...mockUser.profile, groups: ['g1', 'g2', 'g3', 'g4'] },
    });
    expect(screen.getByText(/belongs to/)).toHaveProperty(
      'innerHTML',
      '<b>username</b> belongs to <b>g1</b>, <b>g2</b>, <b>g3</b> and <b>g4</b> groups.',
    );
  });
});
