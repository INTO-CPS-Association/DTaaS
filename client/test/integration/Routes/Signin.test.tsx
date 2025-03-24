import { screen } from '@testing-library/react';
import { setupIntegrationTest } from 'test/integration/integration.testUtil';
import { testPublicLayout } from './routes.testUtil';

// Bypass the config verification
global.fetch = jest.fn().mockResolvedValue({
  ok: true,
  status: 200,
  json: async () => ({ data: 'success' }),
});

Object.defineProperty(AbortSignal, 'timeout', {
  value: jest.fn(),
  writable: false,
});

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
