import { screen } from '@testing-library/react';
import { setupIntegrationTest } from 'test/integration/integration.testUtil';
import { testPublicLayout } from 'test/integration/Routes/routes.testUtil';

// Bypass the config verification
globalThis.fetch = jest.fn().mockResolvedValue({
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

  it('renders the SignIn page with the Public Layout correctly', async () => {
    await testPublicLayout();
    expect(screen.getByRole('button', { name: /SignIn/i })).toBeVisible();
    expect(
      screen.getAllByTestId(/LockOutlinedIcon/i).length,
    ).toBeGreaterThanOrEqual(1);
  });
});
