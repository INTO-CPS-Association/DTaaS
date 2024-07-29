import { screen } from '@testing-library/react';
import {
  testAccountSettings,
  testStaticAccountProfile,
} from '../../unitTests/testUtils';
import { mockUser, mockUserType } from '../../unitTests/__mocks__/global_mocks';
import { setupIntegrationTest, testLayout } from '../integrationTestUtils';

const setup = (user: mockUserType) => setupIntegrationTest('/account', user);

describe('Account', () => {
  it('renders the Account page and Layout correctly', async () => {
    setup(mockUser);
    await testLayout();
    testStaticAccountProfile(mockUser);
    await testAccountSettings(mockUser);
  }, 7000);

  it('renders the Account page with different amounts of groups', async () => {
    setup({ ...mockUser, profile: { ...mockUser.profile, groups: [] } });
    expect(screen.getByText(/belong to/)).toHaveProperty(
      'innerHTML',
      '<b>username</b> does not belong to any groups.',
    );

    setup({ ...mockUser, profile: { ...mockUser.profile, groups: ['g1'] } });
    expect(screen.getByText(/belongs to/)).toHaveProperty(
      'innerHTML',
      '<b>username</b> belongs to <b>g1</b> group.',
    );

    setup({
      ...mockUser,
      profile: { ...mockUser.profile, groups: ['g1', 'g2'] },
    });
    expect(screen.getByText(/belongs to/)).toHaveProperty(
      'innerHTML',
      '<b>username</b> belongs to <b>g1</b> and <b>g2</b> groups.',
    );

    setup({
      ...mockUser,
      profile: { ...mockUser.profile, groups: ['g1', 'g2', 'g3'] },
    });
    expect(screen.getByText(/belongs to/)).toHaveProperty(
      'innerHTML',
      '<b>username</b> belongs to <b>g1</b>, <b>g2</b> and <b>g3</b> groups.',
    );

    setup({
      ...mockUser,
      profile: { ...mockUser.profile, groups: ['g1', 'g2', 'g3', 'g4'] },
    });
    expect(screen.getByText(/belongs to/)).toHaveProperty(
      'innerHTML',
      '<b>username</b> belongs to <b>g1</b>, <b>g2</b>, <b>g3</b> and <b>g4</b> groups.',
    );
  });
});
