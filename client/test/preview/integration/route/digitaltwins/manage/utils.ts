import { combineReducers, configureStore } from '@reduxjs/toolkit';
import { Asset } from 'preview/components/asset/Asset';
import fileSlice, {
  FileState,
  addOrUpdateFile,
} from 'preview/store/file.slice';
import assetsReducer, { setAssets } from 'preview/store/assets.slice';
import digitalTwinReducer, {
  setDigitalTwin,
} from 'preview/store/digitalTwin.slice';
import snackbarReducer from 'preview/store/snackbar.slice';
import { mockGitlabInstance } from 'test/preview/__mocks__/global_mocks';
import DigitalTwin from 'preview/util/digitalTwin';

const setupStore = () => {
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
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        serializableCheck: false,
      }),
  });

  const digitalTwin = new DigitalTwin('Asset 1', mockGitlabInstance);
  digitalTwin.descriptionFiles = ['description.md'];

  store.dispatch(setAssets(preSetItems));
  store.dispatch(setDigitalTwin({ assetName: 'Asset 1', digitalTwin }));
  store.dispatch(addOrUpdateFile(files[0]));

  return store;
};

export default setupStore;
