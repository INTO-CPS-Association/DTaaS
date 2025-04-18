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

const mockGitlab = {
  init: jest.fn().mockImplementation(() => Promise.resolve()),
  api: mockApi,
  projectId: 1,
  commonProjectId: 2,
  triggerToken: 'test-token',
  logs: [],
  getProjectIds: jest.fn(),
  getTriggerToken: jest.fn(),
};

jest.mock('model/backend/gitlab/gitlab', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => mockGitlab),
  initialGitlabInstance: mockGitlab,
  createGitlabInstance: jest.fn().mockImplementation(() => mockGitlab),
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

const setDigitalTwin = jest.fn();
jest.mock('preview/store/digitalTwin.slice', () => ({
  setDigitalTwin,
}));

jest.mock('preview/util/gitlabFactory', () => ({
  createGitlabInstance: () => mockGitlab,
}));

import { fetchDigitalTwins, fetchLibraryAssets } from 'preview/util/init';
import { getLibrarySubfolders } from 'preview/util/libraryAsset';

describe('fetchAssets', () => {
  const dispatch = jest.fn();
  const setError = jest.fn();

  beforeEach(() => {
    getDTSubfolders.mockResolvedValue([{ name: 'DT1' }, { name: 'DT2' }]);
    DigitalTwin.mockImplementation(() => ({
      getDescription: jest.fn().mockResolvedValue('Mock description'),
    }));
    setDigitalTwin.mockImplementation(() => {});
  });

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
