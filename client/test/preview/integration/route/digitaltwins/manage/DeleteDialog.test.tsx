import AssetBoard from 'preview/components/asset/AssetBoard';
import { render, screen, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import * as React from 'react';
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
import digitalTwinReducer, {
  setDigitalTwin,
} from 'preview/store/digitalTwin.slice';
import DigitalTwin from 'preview/util/gitlabDigitalTwin';
import { mockGitlabInstance } from 'test/preview/__mocks__/global_mocks';
import snackbarReducer from 'preview/store/snackbar.slice';
import { Asset } from 'preview/components/asset/Asset';

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

describe('DeleteDialog', () => {
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
