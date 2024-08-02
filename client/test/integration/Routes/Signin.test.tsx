import { screen } from '@testing-library/react';
import { setupIntegrationTest } from '../integration.testUtils';
import { testPublicLayout } from './routes.testUtils';

const setup = () => setupIntegrationTest('/');

describe('Signin', () => {
  beforeEach(async () => {
    await setup();
  });

  it('renders the Sign in page with the Public Layout correctly', async () => {
    await testPublicLayout();
    expect(
      screen.getByRole('button', { name: /Sign In with GitLab/i }),
    ).toBeVisible();
    expect(screen.getByTestId(/LockOutlinedIcon/i)).toBeVisible();
  });
});
