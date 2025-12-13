import LibraryPreview from 'preview/route/library/LibraryPreview';
import store from 'store/store';
import { act, render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { useAuth } from 'react-oidc-context';

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
}));

jest.mock('react-oidc-context', () => ({
  ...jest.requireActual('react-oidc-context'),
  useAuth: jest.fn(),
}));

describe('Library Preview', () => {
  it('displays content of tabs', async () => {
    (useAuth as jest.Mock).mockReturnValue({
      user: {
        profile: {
          profile: 'testProfileUrl',
        },
      },
    });

    await act(async () => {
      render(
        <Provider store={store}>
          <MemoryRouter>
            <LibraryPreview />
          </MemoryRouter>
        </Provider>,
      );
    });

    expect(screen.getByText('Selection')).toBeInTheDocument();
  });
});
