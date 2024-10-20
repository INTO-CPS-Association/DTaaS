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
import digitalTwinReducer, {
  setDigitalTwin,
} from 'preview/store/digitalTwin.slice';
import DigitalTwin from 'preview/util/gitlabDigitalTwin';
import { mockGitlabInstance } from 'test/preview/__mocks__/global_mocks';
import snackbarReducer from 'preview/store/snackbar.slice';

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
  store.dispatch(setDigitalTwin({ assetName: 'Asset 1', digitalTwin }));
  store.dispatch(addOrUpdateFile(files[0]));

  React.act(() => {
    render(
      <Provider store={store}>
        <AssetBoard tab="Manage" error={null} />
      </Provider>,
    );
  });
};

describe('DetailsDialog', () => {
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
