/* eslint-disable import/first */
const getDTSubfolders = jest.fn();
jest.mock('src/util/digitalTwinUtils', () => ({
  getDTSubfolders,
}));

const DigitalTwin = jest.fn();
jest.mock('src/digitalTwin', () => ({
  __esModule: true,
  default: DigitalTwin,
}));

const mockGetLibrarySubfolders = jest.fn();
const mockLibraryAsset = jest.fn();
jest.mock('src/libraryAsset', () => ({
  __esModule: true,
  getLibrarySubfolders: mockGetLibrarySubfolders,
  default: mockLibraryAsset,
}));

const setAsset = jest.fn();
jest.mock('src/store/assets.slice', () => ({
  __esModule: true,
  setAsset,
  default: (state = {}) => state,
}));

const setDigitalTwin = jest.fn();
jest.mock('src/state/digitalTwin.slice', () => ({
  __esModule: true,
  setDigitalTwin,
  default: (state = {}) => state,
}));

jest.deepUnmock('src/util/init');

import {
  fetchDigitalTwins,
  fetchLibraryAssets,
  initDigitalTwin,
} from 'src/util/init';
import { getLibrarySubfolders } from 'src/libraryAsset';
import {
  mockAuthority,
  mockBackendAPI,
  mockBackendInstance,
} from 'test/__mocks__/global_mocks';
import { createGitlabInstance } from 'src/gitlab/gitlabFactory';

describe('fetchAssets', () => {
  const dispatch = jest.fn();
  const setError = jest.fn();
  const mockDTInitialize = jest.fn().mockResolvedValue(undefined);
  const mockLibraryGetDescription = jest
    .fn()
    .mockResolvedValue('Mock library description');

  beforeEach(() => {
    mockBackendInstance.getProjectId = jest.fn().mockReturnValue(1);
    mockBackendInstance.getCommonProjectId = jest.fn().mockReturnValue(2);
    mockBackendInstance.init = jest.fn();
    (createGitlabInstance as jest.Mock).mockReturnValue(mockBackendInstance);
    getDTSubfolders.mockResolvedValue([{ name: 'DT1' }, { name: 'DT2' }]);
    mockGetLibrarySubfolders.mockResolvedValue([
      { name: 'asset1', path: 'path1', type: 'models', isPrivate: false },
      { name: 'asset2', path: 'path2', type: 'models', isPrivate: false },
    ]);
    DigitalTwin.mockImplementation(() => ({ initialize: mockDTInitialize }));
    setDigitalTwin.mockImplementation(() => {});
    mockLibraryAsset.mockImplementation(() => ({
      getDescription: mockLibraryGetDescription,
    }));
  });

  it('should throw an error if gitlab fails to initialize', async () => {
    const errorMessage = 'Failed to initialize Gitlab';
    (mockBackendInstance.init as jest.Mock).mockRejectedValue(errorMessage);
    const assetType = 'functions';
    await fetchLibraryAssets(dispatch, setError, assetType, true);
    expect(setError).toHaveBeenCalledWith(
      `An error occurred while fetching assets: ${errorMessage}`,
    );
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
    expect(mockBackendInstance.init).toHaveBeenCalledTimes(1);
    expect(mockLibraryGetDescription).toHaveBeenCalledTimes(2);
    expect(dispatch).toHaveBeenCalledTimes(2);

    const { calls } = setAsset.mock;
    expect(calls.length).toBe(2);
  });

  it('should fetch digital twins and set them', async () => {
    await fetchDigitalTwins(dispatch, setError);

    expect(getDTSubfolders).toHaveBeenCalledWith(1, mockBackendAPI);
    expect(getLibrarySubfolders).toHaveBeenCalledWith(
      1,
      'Digital Twins',
      mockBackendInstance,
    );

    expect(createGitlabInstance).toHaveBeenCalledTimes(3);
    expect(mockBackendInstance.init).toHaveBeenCalledTimes(3);
    expect(mockDTInitialize).toHaveBeenCalledTimes(2);
    expect(dispatch).toHaveBeenCalledTimes(4);

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

  it('initializes a DigitalTwin with initDigitalTwin', async () => {
    Object.defineProperty(globalThis, 'sessionStorage', {
      value: {
        getItem: jest.fn(() => null),
      },
    });
    const DT = await initDigitalTwin('my digital twin');
    expect(createGitlabInstance).toHaveBeenCalledWith('', '', mockAuthority);
    expect(mockBackendInstance.init).toHaveBeenCalled();
    expect(DigitalTwin).toHaveBeenCalledWith(
      'my digital twin',
      mockBackendInstance,
    );
    expect(DT).toEqual(new DigitalTwin('my digital twin', mockBackendInstance));
  });

  it('initializes a DigitalTwin with initDigitalTwin with sessionStorage', async () => {
    Object.defineProperty(globalThis, 'sessionStorage', {
      value: {
        getItem: jest.fn((itemName) => {
          if (itemName === 'username') return 'my username';
          if (itemName === 'access_token') return 'my token';
          return null;
        }),
      },
    });
    const DT = await initDigitalTwin('my digital twin');
    expect(createGitlabInstance).toHaveBeenCalledWith(
      'my username',
      'my token',
      mockAuthority,
    );
    expect(mockBackendInstance.init).toHaveBeenCalled();
    expect(DigitalTwin).toHaveBeenCalledWith(
      'my digital twin',
      mockBackendInstance,
    );
    expect(DT).toEqual(new DigitalTwin('my digital twin', mockBackendInstance));
  });
});
