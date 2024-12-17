import { screen, act } from '@testing-library/react';
import { setupIntegrationTest } from 'test/integration/integration.testUtil';
import { getValidationResults } from 'route/auth/VerifyConfig';
import { testPublicLayout } from './routes.testUtil';

const setup = () => setupIntegrationTest('/');

describe('Signin', () => {
  it('renders the Sign in page with the Public Layout correctly', async () => {
    (getValidationResults as jest.Mock).mockReturnValue(
      Promise.resolve({ configField: 'test' }),
    );
    await act(async () => {
      await setup();
    });
    await testPublicLayout();
    expect(
      screen.getByRole('button', { name: /Sign In with GitLab/i }),
    ).toBeVisible();
    expect(screen.getByTestId(/LockOutlinedIcon/i)).toBeVisible();
  });
});
