import { getDTSubfolders } from 'preview/util/digitalTwinUtils';
import { DT_DIRECTORY } from 'model/backend/gitlab/constants';

const mockApi = {
  init: jest.fn(),
  startPipeline: jest.fn(),
  cancelPipeline: jest.fn(),
  createRepositoryFile: jest.fn(),
  editRepositoryFile: jest.fn(),
  removeRepositoryFile: jest.fn(),
  getRepositoryFileContent: jest.fn(),
  listRepositoryFiles: jest.fn(),
  getGroupByName: jest.fn(),
  listGroupProjects: jest.fn(),
  listPipelineJobs: jest.fn(),
  getJobLog: jest.fn(),
  getPipelineStatus: jest.fn(),
};

describe('DigitalTwinUtil', () => {
  it('should fetch DT subfolders successfully', async () => {
    const projectId = 5;
    const files = [
      { name: 'subfolder1', path: 'digital_twins/subfolder1', type: 'tree' },
      { name: 'subfolder2', path: 'digital_twins/subfolder2', type: 'tree' },
      { name: 'file1', path: 'digital_twins/file1', type: 'blob' },
    ];

    mockApi.listRepositoryFiles.mockResolvedValue(files);

    const subfolders = await getDTSubfolders(projectId, mockApi);

    expect(subfolders).toHaveLength(2);

    expect(mockApi.listRepositoryFiles).toHaveBeenCalledWith(
      projectId,
      DT_DIRECTORY, // recursive is false by default
    );
  });
});
