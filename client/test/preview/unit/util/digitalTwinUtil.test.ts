import { getDTSubfolders } from 'preview/util/digitalTwinUtils';
import { Gitlab } from '@gitbeaker/rest';
import { DT_DIRECTORY } from 'model/backend/gitlab/constants';

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

describe('DigitalTwinUtil', () => {
  it('should fetch DT subfolders successfully', async () => {
    const projectId = 5;
    const files = [
      { name: 'subfolder1', path: 'digital_twins/subfolder1', type: 'tree' },
      { name: 'subfolder2', path: 'digital_twins/subfolder2', type: 'tree' },
      { name: 'file1', path: 'digital_twins/file1', type: 'blob' },
    ];

    mockApi.Repositories.allRepositoryTrees.mockResolvedValue(files);

    const subfolders = await getDTSubfolders(
      projectId,
      mockApi as unknown as InstanceType<typeof Gitlab>,
    );

    expect(subfolders).toHaveLength(2);

    expect(mockApi.Repositories.allRepositoryTrees).toHaveBeenCalledWith(
      projectId,
      {
        path: DT_DIRECTORY,
        recursive: false,
      },
    );
  });
});
