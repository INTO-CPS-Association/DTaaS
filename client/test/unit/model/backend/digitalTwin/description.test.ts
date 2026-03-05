import DigitalTwin from 'model/backend/digitalTwin';
import {
  getBranchName,
  getGroupName,
} from 'model/backend/gitlab/digitalTwinConfig/settingsUtility';
import { mockBackendAPI } from 'test/__mocks__/global_mocks';
import { getAuthority } from 'util/envUtil';
import {
  mockGitlabInstance,
  setupBeforeEach,
  createDigitalTwin,
} from './testSetup';

describe('DigitalTwin - description', () => {
  let dt: DigitalTwin;

  beforeEach(() => {
    dt = createDigitalTwin();
    setupBeforeEach(dt);
  });

  it('should get description', async () => {
    (mockBackendAPI.getRepositoryFileContent as jest.Mock).mockResolvedValue({
      content: 'Test description content',
    });

    await dt.getDescription();

    expect(dt.description).toBe('Test description content');
    expect(mockBackendAPI.getRepositoryFileContent).toHaveBeenCalledWith(
      1,
      'digital_twins/test-DTName/description.md',
      getBranchName(),
    );
  });

  it('should return empty description if no description file exists', async () => {
    (mockBackendAPI.getRepositoryFileContent as jest.Mock).mockRejectedValue(
      new Error('File not found'),
    );

    await dt.getDescription();

    expect(dt.description).toBe('There is no description.md file');
  });

  it('should return full description with updated image URLs if projectId exists', async () => {
    const mockContent =
      'Test README content with an image ![alt text](image.png)';
    (mockBackendAPI.getRepositoryFileContent as jest.Mock).mockResolvedValue({
      content: mockContent,
    });

    await dt.getFullDescription();

    expect(dt.fullDescription).toBe(
      `Test README content with an image ![alt text](${getAuthority()}/${getGroupName()}/testUser/-/raw/${getBranchName()}/digital_twins/test-DTName/image.png)`,
    );
    expect(mockBackendAPI.getRepositoryFileContent).toHaveBeenCalledWith(
      1,
      'digital_twins/test-DTName/README.md',
      getBranchName(),
    );
  });

  it('should return error message if no README.md file exists', async () => {
    (mockBackendAPI.getRepositoryFileContent as jest.Mock).mockRejectedValue(
      new Error('File not found'),
    );

    await dt.getFullDescription();

    expect(dt.fullDescription).toBe('There is no README.md file');
  });

  afterEach(() => {
    // Restore any mocks that were overridden during tests
    mockGitlabInstance.getProjectId = jest.fn().mockReturnValue(1);
  });
});
