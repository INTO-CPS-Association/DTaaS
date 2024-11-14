import AssetBoard from 'preview/components/asset/AssetBoard';
import { act, render, screen, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import * as React from 'react';
import setupStore from './utils';

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
}));

jest.mock('preview/util/init', () => ({
  fetchAssets: jest.fn(),
}));

jest.useFakeTimers();

describe('DetailsDialog', () => {
  let storeDetails: ReturnType<typeof setupStore>;

  beforeEach(() => {
    storeDetails = setupStore();

    act(() => {
      render(
        <Provider store={storeDetails}>
          <AssetBoard tab="Manage" />
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
    act(() => {
      detailsButton.click();
    });

    await waitFor(() => {
      const detailsDialog = screen.getByText(
        /There is no README\.md file/,
      );
      expect(detailsDialog).toBeInTheDocument();
    });
  });

  it('closes the DetailsDialog when the Close button is clicked', async () => {
    const detailsButton = screen.getByRole('button', { name: /Details/i });
    act(() => {
      detailsButton.click();
    });

    const closeButton = await screen.findByRole('button', { name: /Close/i });

    act(() => {
      closeButton.click();
    });

    await waitFor(() => {
      expect(
        screen.queryByText(
          'There is no README.md file',
        ),
      ).toBeNull();
    });
  });
});
