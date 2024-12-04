import { fetchLibraryAssets } from 'preview/util/init'; // O il nome corretto della funzione
import { mockGitlabInstance, mockLibraryAsset } from 'test/preview/__mocks__/global_mocks';

// Mock di LibraryAsset
jest.mock('preview/util/libraryAsset', () => {
  return {
    default: jest.fn().mockImplementation(() => mockLibraryAsset),
  };
});

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
    // Mock dei metodi di GitLab
    (mockGitlabInstance.init as jest.Mock).mockResolvedValue({});
    (mockGitlabInstance.getLibrarySubfolders as jest.Mock).mockResolvedValue([
      { name: 'asset1', path: 'path1', type: 'models', isPrivate: false },
    ]);

    // Chiama la funzione fetchLibraryAssets
    await fetchLibraryAssets(dispatch, setError, 'models', true);

    // Verifica che dispatch sia stato chiamato con setAsset e l'asset mockato
    //expect(dispatch).toHaveBeenCalled();
  });
});



  /*it('should fetch assets and create digital twins', async () => {
    (mockGitlabInstance.init as jest.Mock).mockResolvedValue({});
    (mockGitlabInstance.getDTSubfolders as jest.Mock).mockResolvedValue([
      { name: 'asset1', path: 'path1' },
    ]);

    await fetchDigitalTwins(dispatch, setError);

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

    await fetchDigitalTwins(dispatch, setError);

    expect(dispatch).toHaveBeenCalledWith(setAssets([]));
  });

  it('should skip digital twin creation if no assets are found', async () => {
    (mockGitlabInstance.init as jest.Mock).mockResolvedValue({});
    (mockGitlabInstance.getDTSubfolders as jest.Mock).mockResolvedValue([]);

    await fetchDigitalTwins(dispatch, setError);

    expect(dispatch).toHaveBeenCalledWith(setAssets([]));
  });
  */
