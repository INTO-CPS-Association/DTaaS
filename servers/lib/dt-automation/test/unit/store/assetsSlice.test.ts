import assetsSlice, { deleteAsset, setAssets } from 'model/store/assets.slice';
import LibraryAsset from 'model/backend/libraryAsset';
import { mockLibraryAsset } from 'test/__mocks__/global_mocks';

describe('assets reducer', () => {
  const initialState: { items: LibraryAsset[] } = { items: [] };
  const asset1 = mockLibraryAsset;

  it('should handle setAssets', () => {
    const newState = assetsSlice(initialState, setAssets([asset1]));
    expect(newState.items).toEqual([asset1]);
  });

  it('should handle deleteAsset', () => {
    const stateWithAsset = { items: [asset1] };
    const newState = assetsSlice(stateWithAsset, deleteAsset('path'));
    expect(newState.items).toEqual([]);
  });
});
