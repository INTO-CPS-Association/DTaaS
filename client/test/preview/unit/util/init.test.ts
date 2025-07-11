/* eslint-disable import/first */
const getDTSubfolders = jest.fn();
jest.mock('preview/util/digitalTwinUtils', () => ({
  getDTSubfolders,
}));

const DigitalTwin = jest.fn();
jest.mock('preview/util/digitalTwin', () => ({
  default: DigitalTwin,
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

import { fetchDigitalTwins, fetchLibraryAssets } from 'preview/util/init';
import { getLibrarySubfolders } from 'preview/util/libraryAsset';
import {
  mockBackendInstance,
  mockBackendAPI,
} from 'test/__mocks__/global_mocks';
import { createGitlabInstance } from 'model/backend/gitlab/gitlabFactory';

describe('fetchAssets', () => {
  const dispatch = jest.fn();
  const setError = jest.fn();
  const mockGetDescription = jest.fn().mockResolvedValue('Mock description');

  beforeEach(() => {
    mockBackendInstance.getProjectId = jest.fn().mockReturnValue(1);
    mockBackendInstance.getCommonProjectId = jest.fn().mockReturnValue(2);
    mockBackendInstance.init = jest.fn().mockResolvedValue(undefined);
    (createGitlabInstance as jest.Mock).mockReturnValue(mockBackendInstance);
    getDTSubfolders.mockResolvedValue([{ name: 'DT1' }, { name: 'DT2' }]);
    mockGetLibrarySubfolders.mockResolvedValue([
      { name: 'asset1', path: 'path1', type: 'models', isPrivate: false },
    ]);
    DigitalTwin.mockImplementation(() => ({
      getDescription: mockGetDescription,
    }));
    setDigitalTwin.mockImplementation(() => {});
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should fetch library assets and set them', async () => {
    const assetType = 'models';
    await fetchLibraryAssets(dispatch, setError, assetType, true);

    expect(createGitlabInstance).toHaveBeenCalledTimes(1);
    expect(getLibrarySubfolders).toHaveBeenCalledWith(
      1,
      assetType,
      mockBackendInstance,
    );
    expect(mockBackendInstance.init).toHaveBeenCalledTimes(2); // restored count
  });

  it('should fetch digital twins and set them', async () => {
    await fetchDigitalTwins(dispatch, setError);

    expect(getDTSubfolders).toHaveBeenCalledWith(1, mockBackendAPI); // kept
    expect(getLibrarySubfolders).toHaveBeenCalledWith(
      1,
      'Digital Twins',
      mockBackendInstance,
    );

    expect(createGitlabInstance).toHaveBeenCalledTimes(3); // restored count
    expect(mockBackendInstance.init).toHaveBeenCalledTimes(5); // restored count
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
