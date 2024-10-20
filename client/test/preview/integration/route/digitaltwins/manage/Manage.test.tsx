import AssetBoard from 'preview/components/asset/AssetBoard';
import { render, screen, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import * as React from 'react';
import { Asset } from 'preview/components/asset/Asset';
import fileSlice, {
  FileState,
  addOrUpdateFile,
} from 'preview/store/file.slice';
import {
  combineReducers,
  configureStore,
  getDefaultMiddleware,
} from '@reduxjs/toolkit';
import assetsReducer, { setAssets } from 'preview/store/assets.slice';
import digitalTwinReducer, { setDigitalTwin } from 'preview/store/digitalTwin.slice';
import DigitalTwin from 'preview/util/gitlabDigitalTwin';
import { mockGitlabInstance } from 'test/preview/__mocks__/global_mocks';
import snackbarReducer, { showSnackbar } from 'preview/store/snackbar.slice';
import * as ReconfigureDialog from 'preview/route/digitaltwins/manage/ReconfigureDialog';

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
}));

jest.useFakeTimers();

const preSetItems: Asset[] = [{ name: 'Asset 1', path: 'path/asset1' }];

const files: FileState[] = [
  { name: 'Asset 1', content: 'content1', isModified: false },
];

const store = configureStore({
  reducer: combineReducers({
    assets: assetsReducer,
    digitalTwin: digitalTwinReducer,
    snackbar: snackbarReducer,
    files: fileSlice,
  }),
  middleware: getDefaultMiddleware({
    serializableCheck: false,
  }),
});

const setupTest = () => {
  const digitalTwin = new DigitalTwin('Asset 1', mockGitlabInstance);
  digitalTwin.descriptionFiles = ['description.md'];

  store.dispatch(setAssets(preSetItems));
  store.dispatch(
    setDigitalTwin({
      assetName: 'Asset 1',
      digitalTwin,
    }),
  );
  store.dispatch(addOrUpdateFile(files[0]));

  React.act(() => {
    render(
      <Provider store={store}>
        <AssetBoard tab="Manage" error={null} />
      </Provider>,
    );
  });
};

describe('Details', () => {
  beforeEach(() => {
    setupTest();
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

describe('ReconfigureDialog', () => {
  beforeEach(() => {
    setupTest();
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  it('closes the ConfirmationDialog with No', async () => {
    const reconfigureButton = screen.getByRole('button', {
      name: /Reconfigure/i,
    });
    React.act(() => {
      reconfigureButton.click();
    });

    const cancelButton = await screen.findByRole('button', { name: /Cancel/i });
    React.act(() => {
      cancelButton.click();
    });

    const noButton = await screen.findByRole('button', { name: /No/i });
    React.act(() => {
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
    React.act(() => {
      reconfigureButton.click();
    });

    const cancelButton = await screen.findByRole('button', { name: /Cancel/i });
    React.act(() => {
      cancelButton.click();
    });

    const yesButton = await screen.findByRole('button', { name: /Yes/i });
    React.act(() => {
      yesButton.click();
    });

    await waitFor(() => {
      expect(screen.queryByText('Editor')).toBeNull();
    });
  });

  it('updates the description when description.md is modified', async () => {
    jest.spyOn(DigitalTwin.prototype, 'updateFileContent').mockResolvedValue();
    const modifiedFile = {
      ...files[0],
      name: 'description.md',
      content: 'New content',
    };

    React.act(() => {
      store.dispatch(addOrUpdateFile(modifiedFile));
    });

    const reconfigureButton = screen.getByRole('button', {
      name: /Reconfigure/i,
    });

    React.act(() => {
      reconfigureButton.click();
    });

    const saveButton = await screen.findByRole('button', { name: /Save/i });
    React.act(() => {
      saveButton.click();
    });

    const yesButton = await screen.findByRole('button', { name: /Yes/i });
    React.act(() => {
      yesButton.click();
    });

    await waitFor(() => {
      expect(DigitalTwin.prototype.updateFileContent).toHaveBeenCalledWith(
        'description.md',
        'New content',
      );
      const state = store.getState();
      expect(state.digitalTwin['Asset 1'].description).toBe('New content');
    });
  });

  it('calls handleCloseReconfigureDialog when the dialog is closed', () => {
    const setShowDialog = jest.fn();

    ReconfigureDialog.handleCloseReconfigureDialog(setShowDialog);

    expect(setShowDialog).toHaveBeenCalledWith(false);
  });

  it('should dispatch error message when updateFileContent throws an error', async () => {
    const file = { name: 'test.md', content: 'Content', isModified: true };
    const digitalTwin = new DigitalTwin('Asset 1', mockGitlabInstance);
    const dispatch = jest.fn();
  
    jest.spyOn(DigitalTwin.prototype, 'updateFileContent').mockRejectedValue('Mocked error');

    await ReconfigureDialog.handleFileUpdate(file, digitalTwin, dispatch);

    expect(dispatch).toHaveBeenCalledWith(
      showSnackbar({
        message: 'Error updating file test.md: Mocked error',
        severity: 'error',
      }),
    );
  });
});

describe('Delete', () => {
  beforeEach(() => {
    setupTest();
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
      const state = store.getState();
      expect(state.snackbar.open).toBe(true);
      expect(state.snackbar.message).toBe('Asset 1 deleted successfully');
      expect(state.snackbar.severity).toBe('success');
    });
  });
});
