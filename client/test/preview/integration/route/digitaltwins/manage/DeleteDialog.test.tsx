/* import { render, screen, waitFor } from '@testing-library/react';
import * as React from 'react';
import DigitalTwin from 'preview/util/digitalTwin';
import { Provider } from 'react-redux';
import AssetBoard from 'preview/components/asset/AssetBoard';
import setupStore from './utils';

jest.useFakeTimers();

jest.mock('preview/util/init', () => ({
  fetchDigitalTwins: jest.fn(),
}));

describe('DeleteDialog', () => {
  let storeDelete: ReturnType<typeof setupStore>;

  beforeEach(async () => {
    storeDelete = setupStore();

    React.act(() => {
      render(
        <Provider store={storeDelete}>
          <AssetBoard tab="Manage" />
        </Provider>,
      );
    });

    await waitFor(() => {
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  it('opens the DeleteDialog when the Delete button is clicked', async () => {
    const deleteButton = screen.getByRole('button', { name: /Delete/i });
    React.act(() => {
      deleteButton.click();
    });

    await waitFor(() => {
      const deleteDialog = screen.getByText('This step is irreversible', {
        exact: false,
      });
      expect(deleteDialog).toBeInTheDocument();
    });
  });

  it('closes the DeleteDialog when the Cancel button is clicked', async () => {
    const deleteButton = screen.getByRole('button', { name: /Delete/i });
    React.act(() => {
      deleteButton.click();
    });

    const cancelButton = await screen.findByRole('button', { name: /Cancel/i });

    React.act(() => {
      cancelButton.click();
    });

    await waitFor(() => {
      expect(
        screen.queryByText('This step is irreversible', { exact: false }),
      ).toBeNull();
    });
  });

  it('deletes the asset when the Yes button is clicked', async () => {
    jest
      .spyOn(DigitalTwin.prototype, 'delete')
      .mockResolvedValue('Asset 1 deleted successfully');

    const deleteButton = screen.getByRole('button', { name: /Delete/i });
    React.act(() => {
      deleteButton.click();
    });

    const yesButton = await screen.findByRole('button', { name: /Yes/i });

    React.act(() => {
      yesButton.click();
    });

    await waitFor(() => {
      const state = storeDelete.getState();
      expect(state.snackbar.open).toBe(true);
      expect(state.snackbar.message).toBe('Asset 1 deleted successfully');
      expect(state.snackbar.severity).toBe('success');
    });
  });
});
*/
