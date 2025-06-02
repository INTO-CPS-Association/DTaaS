/* eslint-disable import/first */
const getDTSubfolders = jest.fn();
jest.mock('preview/util/digitalTwinUtils', () => ({
  getDTSubfolders,
}));

const DigitalTwin = jest.fn();
jest.mock('preview/util/digitalTwin', () => ({
  default: DigitalTwin,
}));

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

const mockInit = jest.fn().mockImplementation(() => Promise.resolve());
const mockGitlab = {
  init: mockInit,
  api: mockApi,
  triggerToken: 'test-token',
  logs: [],
  setProjectIds: jest.fn(),
  getProjectId: jest.fn().mockReturnValue(1),
  getCommonProjectId: jest.fn().mockReturnValue(2),
  getTriggerToken: jest.fn(),
};

const createGitlabInstance = jest.fn();
jest.mock('model/backend/gitlab/gitlab', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => mockGitlab),
  initialGitlabInstance: mockGitlab,
}));

const mockGetLibrarySubfolders = jest.fn();
jest.mock('preview/util/libraryAsset', () => ({
  getLibrarySubfolders: mockGetLibrarySubfolders,
}));

jest.mock('preview/store/assets.slice', () => ({
  setAsset: jest.fn(),
  setAssets: jest.fn(),
}));

const setDigitalTwin = jest.fn();
jest.mock('preview/store/digitalTwin.slice', () => ({
  setDigitalTwin,
}));

jest.mock('preview/util/gitlabFactory', () => ({
  createGitlabInstance,
}));

import { fetchDigitalTwins, fetchLibraryAssets } from 'preview/util/init';
import { getLibrarySubfolders } from 'preview/util/libraryAsset';

describe('fetchAssets', () => {
  const dispatch = jest.fn();
  const setError = jest.fn();
  const mockGetDescription = jest.fn().mockResolvedValue('Mock description');

  beforeEach(() => {
    mockGitlab.getProjectId = jest.fn().mockReturnValue(1);
    mockGitlab.getCommonProjectId = jest.fn().mockReturnValue(2);
    getDTSubfolders.mockResolvedValue([{ name: 'DT1' }, { name: 'DT2' }]);
    mockGetLibrarySubfolders.mockResolvedValue([
      { name: 'asset1', path: 'path1', type: 'models', isPrivate: false },
    ]);
    DigitalTwin.mockImplementation(() => ({
      getDescription: mockGetDescription,
    }));
    setDigitalTwin.mockImplementation(() => {});
    createGitlabInstance.mockReturnValue({ ...mockGitlab });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should fetch library assets and set them', async () => {
    const assetType = 'models';
    await fetchLibraryAssets(dispatch, setError, assetType, true);
    expect(createGitlabInstance).toHaveBeenCalledTimes(1);
    expect(getLibrarySubfolders).toHaveBeenCalledWith(1, assetType, mockGitlab);
    expect(mockInit).toHaveBeenCalledTimes(2);
  });

  it('should fetch digital twins and set them', async () => {
    await fetchDigitalTwins(dispatch, setError);

    expect(getDTSubfolders).toHaveBeenCalledWith(1, mockApi);
    expect(getLibrarySubfolders).toHaveBeenCalledWith(
      1,
      'Digital Twins',
      mockGitlab,
    );

    expect(createGitlabInstance).toHaveBeenCalledTimes(3);
    // Thrice in fetchDigitalTwins, twice in fetchLibraryAssets
    // TODO: Mock fetchLibraryAssets in this test
    expect(mockInit).toHaveBeenCalledTimes(5);
    expect(mockGetDescription).toHaveBeenCalledTimes(2);
    expect(dispatch).toHaveBeenCalledTimes(2);

    const { calls } = setDigitalTwin.mock;
    expect(calls.length).toBeGreaterThan(0);
    expect(calls[0][0]).toMatchObject({
      assetName: 'DT1',
      digitalTwin: expect.objectContaining(DigitalTwin.prototype),
    });

    expect(calls[1][0]).toMatchObject({
      assetName: 'DT2',
      digitalTwin: expect.objectContaining(DigitalTwin.prototype),
    });
  });
});
