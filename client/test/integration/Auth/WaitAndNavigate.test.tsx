import { act, screen, waitFor } from '@testing-library/react';
import { mockAuthState } from 'test/__mocks__/global_mocks';
import { setupIntegrationTest } from 'test/integration/integration.testUtil';

jest.useFakeTimers();

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

const authStateWithError = { ...mockAuthState, error: Error('Test Error') };
const setup = () => setupIntegrationTest('/library', authStateWithError);
Object.defineProperty(window, 'location', {
  value: {
    ...window.location,
    reload: jest.fn(),
  },
  writable: true,
});

describe('WaitAndNavigate', () => {
  it('redirects to the WaitAndNavigate page when getting useAuth throws an error', async () => {
    await act(async () => {
      await setup();
    });

    expect(screen.getByText('Oops... Test Error')).toBeVisible();
    expect(screen.getByText('Waiting for 5 seconds...')).toBeVisible();

    await act(async () => {
      jest.advanceTimersByTime(5000);
    });

    await waitFor(() => {
      expect(screen.getByText(/Sign In with GitLab/i)).toBeVisible();
    });
  });
});
