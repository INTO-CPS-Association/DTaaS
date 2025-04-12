import { fetchLibraryAssets } from 'preview/util/init';
import {
  mockGitlabInstance,
  mockLibraryAsset,
} from 'test/preview/__mocks__/global_mocks';

jest.mock('preview/util/libraryAsset', () => ({
  default: jest.fn().mockImplementation(() => mockLibraryAsset),
}));

jest.mock('preview/util/gitlab', () => {
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
    (mockGitlabInstance.init as jest.Mock).mockResolvedValue({});
    (mockGitlabInstance.getLibrarySubfolders as jest.Mock).mockResolvedValue([
      { name: 'asset1', path: 'path1', type: 'models', isPrivate: false },
    ]);

    const assetType = 'models';
    await fetchLibraryAssets(dispatch, setError, assetType, true);
  });
});
