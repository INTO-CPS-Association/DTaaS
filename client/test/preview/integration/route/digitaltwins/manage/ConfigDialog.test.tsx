import AssetBoard from 'preview/components/asset/AssetBoard';
import { act, render, screen, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import * as React from 'react';
import DigitalTwin from 'preview/util/digitalTwin';
import { mockGitlabInstance } from 'test/preview/__mocks__/global_mocks';
import { showSnackbar } from 'preview/store/snackbar.slice';
import * as ReconfigureDialog from 'preview/route/digitaltwins/manage/ReconfigureDialog';
import {
  addOrUpdateFile,
  removeAllModifiedFiles,
} from 'preview/store/file.slice';
import DTAssets from 'preview/util/DTAssets';
import setupStore from './utils';

jest.useFakeTimers();

jest.mock('preview/util/init', () => ({
  fetchAssets: jest.fn(),
}));

describe('ReconfigureDialog', () => {
  let storeConfig: ReturnType<typeof setupStore>;
  let dispatchSpy: jest.SpyInstance;

  beforeEach(() => {
    storeConfig = setupStore();

    dispatchSpy = jest.spyOn(storeConfig, 'dispatch');

    act(() => {
      render(
        <Provider store={storeConfig}>
          <AssetBoard tab="Manage" />
        </Provider>,
      );
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  it('closes the ConfirmationDialog with No', async () => {
    const reconfigureButton = screen.getByRole('button', {
      name: /Reconfigure/i,
    });

    await act(async () => {
      reconfigureButton.click();
    });

    const cancelButton = await screen.findByRole('button', { name: /Cancel/i });
    await act(async () => {
      cancelButton.click();
    });

    const noButton = await screen.findByRole('button', { name: /No/i });
    await act(async () => {
      noButton.click();
    });

    await waitFor(() => {
      expect(screen.queryByText('Are you sure you want to cancel?')).toBeNull();
      expect(screen.queryByText('Editor')).toBeInTheDocument();
    });
  });

  it('closes the Confirmation dialog with Yes', async () => {
    const reconfigureButton = screen.getByRole('button', {
      name: /Reconfigure/i,
    });
    await act(async () => {
      reconfigureButton.click();
    });

    const cancelButton = await screen.findByRole('button', { name: /Cancel/i });
    await act(async () => {
      cancelButton.click();
    });

    const yesButton = await screen.findByRole('button', { name: /Yes/i });
    await act(async () => {
      yesButton.click();
    });

    await waitFor(() => {
      expect(screen.queryByText('Editor')).toBeNull();
    });

    expect(dispatchSpy).toHaveBeenCalledWith(removeAllModifiedFiles());
  });

  it('updates the description when description.md is modified', async () => {
    const updateFileContent = jest
      .spyOn(DTAssets.prototype, 'updateFileContent')
      .mockResolvedValue();
    const modifiedFile = {
      name: 'description.md',
      content: 'New content',
      isNew: false,
      isModified: true,
    };

    act(() => {
      storeConfig.dispatch(addOrUpdateFile(modifiedFile));
    });

    const reconfigureButton = screen.getByRole('button', {
      name: /Reconfigure/i,
    });
    await act(async () => {
      reconfigureButton.click();
    });

    const saveButton = await screen.findByRole('button', { name: /Save/i });
    await act(async () => {
      saveButton.click();
    });

    const yesButton = await screen.findByRole('button', { name: /Yes/i });
    await act(async () => {
      yesButton.click();
    });

    await waitFor(() => {
      expect(updateFileContent).toHaveBeenCalled();
      const state = storeConfig.getState();
      expect(state.digitalTwin['Asset 1'].description).toBe('New content');
    });
  });

  it('calls handleCloseReconfigureDialog when the dialog is closed', () => {
    const setShowDialog = jest.fn();
    ReconfigureDialog.handleCloseReconfigureDialog(setShowDialog);
    expect(setShowDialog).toHaveBeenCalledWith(false);
  });

  it('should dispatch error message when updateFileContent throws an error', async () => {
    const file = {
      name: 'test.md',
      content: 'Content',
      isNew: false,
      isModified: true,
    };
    const digitalTwin = new DigitalTwin('Asset 1', mockGitlabInstance);
    const dispatch = jest.fn();

    jest
      .spyOn(digitalTwin.DTAssets, 'updateFileContent')
      .mockRejectedValue(new Error('Mocked error'));

    await act(async () => {
      await ReconfigureDialog.handleFileUpdate(file, digitalTwin, dispatch);
    });

    expect(dispatch).toHaveBeenCalledWith(
      showSnackbar({
        message: 'Error updating file test.md: Error: Mocked error',
        severity: 'error',
      }),
    );
  });
});
