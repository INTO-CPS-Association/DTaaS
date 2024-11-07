import { fetchAssets } from 'preview/util/init';
import { setAssets } from 'preview/store/assets.slice';
import { setDigitalTwin } from 'preview/store/digitalTwin.slice';
import {
  mockDigitalTwin,
  mockGitlabInstance,
} from 'test/preview/__mocks__/global_mocks';

jest.mock('preview/util/gitlab', () => {
  const mockSimpleGitlabInstance = {
    init: jest.fn(),
    getDTSubfolders: jest.fn(),
    projectId: 1,
  };

  return {
    default: jest.fn().mockImplementation(() => mockSimpleGitlabInstance),
  };
});

jest.mock('preview/util/digitalTwin', () => ({
  default: jest.fn().mockImplementation(() => mockDigitalTwin),
}));

jest.mock('preview/store/assets.slice', () => ({
  setAssets: jest.fn(),
}));
jest.mock('preview/store/digitalTwin.slice', () => ({
  setDigitalTwin: jest.fn(),
}));

describe('fetchAssets', () => {
  const dispatch = jest.fn();
  const setError = jest.fn();

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should fetch assets and create digital twins', async () => {
    (mockGitlabInstance.init as jest.Mock).mockResolvedValue({});
    (mockGitlabInstance.getDTSubfolders as jest.Mock).mockResolvedValue([
      { name: 'asset1', path: 'path1' },
    ]);

    await fetchAssets(dispatch, setError);

    expect(dispatch).toHaveBeenCalledWith(
      setAssets([{ name: 'asset1', path: 'path1' }]),
    );
    expect(dispatch).toHaveBeenCalledWith(
      setDigitalTwin({
        assetName: 'asset1',
        digitalTwin: mockDigitalTwin,
      }),
    );
  });

  it('should handle empty project ID by setting assets to an empty array', async () => {
    mockGitlabInstance.projectId = null;

    await fetchAssets(dispatch, setError);

    expect(dispatch).toHaveBeenCalledWith(setAssets([]));
  });

  it('should skip digital twin creation if no assets are found', async () => {
    (mockGitlabInstance.init as jest.Mock).mockResolvedValue({});
    (mockGitlabInstance.getDTSubfolders as jest.Mock).mockResolvedValue([]);

    await fetchAssets(dispatch, setError);

    expect(dispatch).toHaveBeenCalledWith(setAssets([]));
  });

  /*
  it('should init gitlabinstance and return digital twin', async () => {
    (mockGitlabInstance.init as jest.Mock).mockResolvedValue({});

    const digitalTwin = await initDigitalTwin('testName');

    expect(digitalTwin).toBe(mockDigitalTwin);
});
  */
});
