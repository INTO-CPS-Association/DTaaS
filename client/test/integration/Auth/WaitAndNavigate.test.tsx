import { act, screen } from '@testing-library/react';
import { mockAuthState } from 'test/__mocks__/global_mocks';
import { setupIntegrationTest } from 'test/integration/integration.testUtil';

jest.useFakeTimers();

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
  beforeEach(async () => {
    await setup();
  });

  it('redirects to the WaitAndNavigate page when getting useAuth throws an error', async () => {
    expect(screen.getByText('Oops... Test Error')).toBeVisible();
    expect(screen.getByText('Waiting for 5 seconds...')).toBeVisible();

    await act(async () => {
      jest.advanceTimersByTime(5000);
    });

    expect(screen.getByText(/Sign In with GitLab/i)).toBeVisible();
  });
});
