const mockApi = {
  RepositoryFiles: {
    show: jest.fn(),
    remove: jest.fn(),
    edit: jest.fn(),
    create: jest.fn(),
  },
  Repositories: {
    allRepositoryTrees: jest.fn(),
  },
  PipelineTriggerTokens: {
    trigger: jest.fn(),
  },
  Pipelines: {
    cancel: jest.fn(),
  },
};

const mockGitlab = {
  init: jest.fn().mockResolvedValue(undefined),
  api: mockApi,
  projectId: 1,
  commonProjectId: 2,
  triggerToken: 'test-token',
  logs: [],
  getProjectIds: jest.fn(),
  getTriggerToken: jest.fn(),
};

jest.mock('model/backend/gitlab/gitlab', () => {
  return {
    default: jest.fn().mockImplementation(() => mockGitlab),
  };
});

const getDTSubfolders = jest
  .fn()
  .mockResolvedValue([{ name: 'DT1' }, { name: 'DT2' }]);
jest.mock('preview/util/digitalTwinUtils', () => ({
  getDTSubfolders,
}));

jest.mock('preview/util/libraryAsset', () => ({
  getLibrarySubfolders: jest
    .fn()
    .mockResolvedValue([
      { name: 'asset1', path: 'path1', type: 'models', isPrivate: false },
    ]),
}));

jest.mock('preview/store/assets.slice', () => ({
  setAsset: jest.fn(),
  setAssets: jest.fn(),
}));

jest.mock('preview/store/digitalTwin.slice', () => ({
  setDigitalTwin: jest.fn(),
}));

import { fetchDigitalTwins, fetchLibraryAssets } from 'preview/util/init';
import { getLibrarySubfolders } from 'preview/util/libraryAsset';

describe('fetchAssets', () => {
  const dispatch = jest.fn();
  const setError = jest.fn();

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should fetch library assets and set them', async () => {
    const assetType = 'models';
    await fetchLibraryAssets(dispatch, setError, assetType, true);

    expect(getLibrarySubfolders).toHaveBeenCalledWith(
      1,
      assetType,
      true,
      mockGitlab,
    );
  });

  it('should fetch digital twins and set them', async () => {
    await fetchDigitalTwins(dispatch, setError);

    expect(getDTSubfolders).toHaveBeenCalledWith(1, mockApi);
    expect(getLibrarySubfolders).toHaveBeenCalledWith(
      1,
      'Digital Twins',
      true,
      mockGitlab,
    );
  });
});
