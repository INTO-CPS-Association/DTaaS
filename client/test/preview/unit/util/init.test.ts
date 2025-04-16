import { fetchLibraryAssets } from 'preview/util/init';
import { getLibrarySubfolders } from 'preview/util/libraryAsset';

jest.mock('preview/util/libraryAsset', () => ({
  getLibrarySubfolders: jest.fn(),
}));

jest.mock('model/backend/gitlab/gitlab', () => {
  const mockSimpleGitlabInstance = {
    init: jest.fn(),
    getLibrarySubfolders: jest.fn(),
    projectId: 1,
  };

  return {
    default: jest.fn().mockImplementation(() => mockSimpleGitlabInstance),
  };
});

jest.mock('preview/store/assets.slice', () => ({
  setAsset: jest.fn(),
  setAssets: jest.fn(),
}));

describe('fetchAssets', () => {
  const dispatch = jest.fn();
  const setError = jest.fn();

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should fetch library assets and set them', async () => {
    (getLibrarySubfolders as jest.Mock).mockResolvedValue([
      { name: 'asset1', path: 'path1', type: 'models', isPrivate: false },
    ]);

    const assetType = 'models';
    await fetchLibraryAssets(dispatch, setError, assetType, true);
  });
});
