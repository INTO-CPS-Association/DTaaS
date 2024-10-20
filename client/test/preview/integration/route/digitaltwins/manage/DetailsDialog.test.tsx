import AssetBoard from 'preview/components/asset/AssetBoard';
import { render, screen, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import * as React from 'react';
import setupStore from './utils';

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
}));

jest.useFakeTimers();

describe('DetailsDialog', () => {
  let store: ReturnType<typeof setupStore>;

  beforeEach(() => {
    store = setupStore();

    React.act(() => {
      render(
        <Provider store={store}>
          <AssetBoard tab="Manage" error={null} />
        </Provider>,
      );
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders the AssetCardManage with Details button', async () => {
    const detailsButton = screen.getByRole('button', { name: /Details/i });
    expect(detailsButton).toBeInTheDocument();
  });

  it('opens the DetailsDialog when the Details button is clicked', async () => {
    const detailsButton = screen.getByRole('button', { name: /Details/i });
    React.act(() => {
      detailsButton.click();
    });

    await waitFor(() => {
      const detailsDialog = screen.getByText(
        /There is no README\.md file in the Asset 1 GitLab folder/,
      );
      expect(detailsDialog).toBeInTheDocument();
    });
  });

  it('closes the DetailsDialog when the Close button is clicked', async () => {
    const detailsButton = screen.getByRole('button', { name: /Details/i });
    React.act(() => {
      detailsButton.click();
    });

    const closeButton = await screen.findByRole('button', { name: /Close/i });

    React.act(() => {
      closeButton.click();
    });

    await waitFor(() => {
      expect(
        screen.queryByText(
          'There is no README.md file in the Asset 1 GitLab folder',
        ),
      ).toBeNull();
    });
  });
});
