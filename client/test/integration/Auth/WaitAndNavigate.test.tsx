import { act, screen, waitFor } from '@testing-library/react';
import { mockAuthState } from 'test/__mocks__/global_mocks';
import { setupIntegrationTest } from 'test/integration/integration.testUtil';
import * as WaitAndNavigate from 'route/auth/WaitAndNavigate';

jest.useFakeTimers();

// Mock the reloadPage function to avoid jsdom navigation errors
const reloadPageMock = jest
  .spyOn(WaitAndNavigate, 'reloadPage')
  .mockImplementation(() => {});

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

const authStateWithError = { ...mockAuthState, error: Error('Test Error') };
const setup = () => setupIntegrationTest('/library', authStateWithError);

describe('WaitAndNavigate', () => {
  beforeEach(() => {
    reloadPageMock.mockClear();
  });

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

  it('calls reloadPage after navigation', async () => {
    await act(async () => {
      await setup();
    });

    await act(async () => {
      jest.advanceTimersByTime(5000);
    });

    await waitFor(() => {
      expect(reloadPageMock).toHaveBeenCalled();
    });
  });
});
