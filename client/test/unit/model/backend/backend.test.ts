import GitlabAPI from 'model/backend/gitlab/backend';
import { GitbeakerRequestError } from '@gitbeaker/rest';

jest.mock('@gitbeaker/rest', () => ({
  ...jest.requireActual('@gitbeaker/rest'),
  Gitlab: jest.fn(),
}));

const createMockClient = () => ({
  Commits: {
    create: jest.fn().mockResolvedValue({}),
  },
  PipelineTriggerTokens: {
    trigger: jest.fn(),
    all: jest.fn(),
  },
  Pipelines: {
    cancel: jest.fn(),
    show: jest.fn(),
  },
  RepositoryFiles: {
    create: jest.fn(),
    edit: jest.fn(),
    remove: jest.fn(),
    show: jest.fn(),
  },
  Repositories: {
    allRepositoryTrees: jest.fn(),
  },
  Groups: {
    show: jest.fn(),
    allProjects: jest.fn(),
  },
  Jobs: {
    all: jest.fn(),
    showLog: jest.fn(),
    allPipelineBridges: jest.fn(),
    requester: { get: jest.fn() },
  },
});

function createGitlabError(status: number, retryAfter?: string): Error {
  const error = Object.create(GitbeakerRequestError.prototype) as Error;
  Object.defineProperty(error, 'cause', {
    value: {
      response: {
        status,
        headers: {
          get: (name: string) => (name === 'retry-after' ? retryAfter : null),
        },
      },
    },
  });
  return error;
}

describe('GitlabAPI', () => {
  let api: GitlabAPI;
  let mockClient: ReturnType<typeof createMockClient>;

  beforeEach(() => {
    api = new GitlabAPI('https://gitlab.example.com', 'test-token');
    mockClient = createMockClient();
    api.client = mockClient as unknown as GitlabAPI['client'];
  });

  afterEach(() => jest.useRealTimers());

  describe('commitMultipleActions', () => {
    it('should call Commits.create with correct parameters', async () => {
      const projectId = 1;
      const branch = 'main';
      const commitMessage = 'Create digital twin files';
      const actions = [
        {
          action: 'create' as const,
          filePath: 'digital_twins/myDT/config.json',
          content: '{}',
        },
        {
          action: 'update' as const,
          filePath: '.gitlab-ci.yml',
          content: 'updated pipeline',
        },
      ];

      await api.commitMultipleActions(
        projectId,
        branch,
        commitMessage,
        actions,
      );

      expect(mockClient.Commits.create).toHaveBeenCalledWith(
        projectId,
        branch,
        commitMessage,
        actions,
      );
    });

    it('should handle empty actions array', async () => {
      await api.commitMultipleActions(1, 'main', 'Empty commit', []);

      expect(mockClient.Commits.create).toHaveBeenCalledWith(
        1,
        'main',
        'Empty commit',
        [],
      );
    });

    it('should propagate errors from Commits.create', async () => {
      mockClient.Commits.create.mockRejectedValueOnce(
        new Error('Commit failed'),
      );

      await expect(
        api.commitMultipleActions(1, 'main', 'msg', [
          { action: 'create', filePath: 'file.txt', content: 'content' },
        ]),
      ).rejects.toThrow('Commit failed');
    });
  });

  describe('startPipeline', () => {
    it('should throw error if trigger token is not provided', async () => {
      await expect(api.startPipeline(1, 'main', {})).rejects.toThrow(
        'Trigger token is required to start a pipeline',
      );
    });

    it('should call PipelineTriggerTokens.trigger with correct parameters', async () => {
      mockClient.PipelineTriggerTokens.trigger.mockResolvedValue({
        id: 1,
        status: 'running',
      });

      const result = await api.startPipeline(1, 'main', {}, 'trigger-token');

      expect(mockClient.PipelineTriggerTokens.trigger).toHaveBeenCalledWith(
        1,
        'main',
        'trigger-token',
        { variables: {} },
      );
      expect(result).toEqual({ id: 1, status: 'running' });
    });

    it('does not retry a failed pipeline trigger', async () => {
      mockClient.PipelineTriggerTokens.trigger.mockRejectedValue(
        new TypeError('Network unavailable'),
      );

      await expect(
        api.startPipeline(1, 'main', {}, 'trigger-token'),
      ).rejects.toThrow('Network unavailable');

      expect(mockClient.PipelineTriggerTokens.trigger).toHaveBeenCalledTimes(1);
    });
  });

  describe('cancelPipeline', () => {
    it('should cancel a pipeline', async () => {
      mockClient.Pipelines.cancel.mockResolvedValue({
        id: 1,
        status: 'canceled',
      });

      const result = await api.cancelPipeline(1, 1);

      expect(result).toEqual({ id: 1, status: 'canceled' });
    });
  });

  describe('repository file operations', () => {
    it('should create a repository file', async () => {
      mockClient.RepositoryFiles.create.mockResolvedValue({});

      const result = await api.createRepositoryFile(
        1,
        'path/file.txt',
        'main',
        'content',
        'commit msg',
      );

      expect(result).toEqual({ content: 'content' });
      expect(mockClient.RepositoryFiles.create).toHaveBeenCalledWith(
        1,
        'path/file.txt',
        'main',
        'content',
        'commit msg',
      );
    });

    it('should edit a repository file', async () => {
      mockClient.RepositoryFiles.edit.mockResolvedValue({});

      const result = await api.editRepositoryFile(
        1,
        'path/file.txt',
        'main',
        'updated',
        'update msg',
      );

      expect(result).toEqual({ content: 'updated' });
    });

    it('should remove a repository file', async () => {
      mockClient.RepositoryFiles.remove.mockResolvedValue({});

      const result = await api.removeRepositoryFile(
        1,
        'path/file.txt',
        'main',
        'remove msg',
      );

      expect(result).toEqual({ content: '' });
    });

    it('should get repository file content', async () => {
      mockClient.RepositoryFiles.show.mockResolvedValue({
        content: btoa('decoded content'),
      });

      const result = await api.getRepositoryFileContent(
        1,
        'path/file.txt',
        'main',
      );

      expect(result).toEqual({ content: 'decoded content' });
    });
  });

  describe('listRepositoryFiles', () => {
    it('should list repository files and map them', async () => {
      mockClient.Repositories.allRepositoryTrees.mockResolvedValue([
        { name: 'file1.txt', type: 'blob', path: 'dir/file1.txt' },
        { name: 'subdir', type: 'tree', path: 'dir/subdir' },
      ]);

      const result = await api.listRepositoryFiles(1, 'dir', 'main', false);

      expect(result).toEqual([
        { name: 'file1.txt', type: 'blob', path: 'dir/file1.txt' },
        { name: 'subdir', type: 'tree', path: 'dir/subdir' },
      ]);
    });
  });

  describe('getPipelineStatus', () => {
    it('should return pipeline status', async () => {
      mockClient.Pipelines.show.mockResolvedValue({
        status: 'success',
      });

      const result = await api.getPipelineStatus(1, 1);

      expect(result).toBe('success');
    });
  });

  describe('getPipelineBridges', () => {
    it('prefers trigger jobs and returns their downstream pipeline ids', async () => {
      mockClient.Jobs.requester.get.mockResolvedValue({
        body: [
          { id: 1, downstream_pipeline: { id: 42 } },
          { id: 2, downstream_pipeline: undefined },
        ],
      });

      const result = await api.getPipelineBridges(1, 10);

      expect(result).toEqual([
        { downstreamPipelineId: 42 },
        { downstreamPipelineId: null },
      ]);
      expect(mockClient.Jobs.requester.get).toHaveBeenCalledWith(
        'projects/1/pipelines/10/trigger_jobs',
      );
      expect(mockClient.Jobs.allPipelineBridges).not.toHaveBeenCalled();
    });

    it('falls back to bridges only when trigger jobs are unavailable', async () => {
      mockClient.Jobs.requester.get.mockRejectedValue(createGitlabError(404));
      mockClient.Jobs.allPipelineBridges.mockResolvedValue([
        { downstream_pipeline: { id: 42 } },
      ]);

      await expect(api.getPipelineBridges(1, 10)).resolves.toEqual([
        { downstreamPipelineId: 42 },
      ]);

      expect(mockClient.Jobs.allPipelineBridges).toHaveBeenCalledWith(1, 10);
    });

    it('encodes a path-style project ID for the raw trigger-jobs request', async () => {
      mockClient.Jobs.requester.get.mockResolvedValue({ body: [] });

      await api.getPipelineBridges('group/project', 10);

      expect(mockClient.Jobs.requester.get).toHaveBeenCalledWith(
        'projects/group%2Fproject/pipelines/10/trigger_jobs',
      );
    });

    it.each([401, 403, 429, 500])(
      'does not fall back to bridges for a %s trigger-jobs failure',
      async (status) => {
        jest.useFakeTimers();
        mockClient.Jobs.requester.get.mockRejectedValue(
          createGitlabError(status),
        );

        const request = expect(api.getPipelineBridges(1, 10)).rejects.toThrow();
        await jest.runAllTimersAsync();
        await request;

        expect(mockClient.Jobs.allPipelineBridges).not.toHaveBeenCalled();
      },
    );

    it('rejects malformed downstream pipeline IDs', async () => {
      mockClient.Jobs.requester.get.mockResolvedValue({
        body: [{ downstream_pipeline: { id: 'not-a-number' } }],
      });

      await expect(api.getPipelineBridges(1, 10)).rejects.toThrow(
        'invalid downstream pipeline ID',
      );
    });
  });

  describe('getGroupByName', () => {
    it('should return group information', async () => {
      mockClient.Groups.show.mockResolvedValue({
        id: 5,
        name: 'test-group',
      });

      const result = await api.getGroupByName('test-group');

      expect(result).toEqual({ id: 5, name: 'test-group' });
      expect(mockClient.Groups.show).toHaveBeenCalledWith('test-group');
    });
  });

  describe('listGroupProjects', () => {
    it('should return projects in a group', async () => {
      mockClient.Groups.allProjects.mockResolvedValue([
        { id: 1, name: 'project1' },
        { id: 2, name: 'project2' },
      ]);

      const result = await api.listGroupProjects('5');

      expect(result).toEqual([
        { id: 1, name: 'project1' },
        { id: 2, name: 'project2' },
      ]);
      expect(mockClient.Groups.allProjects).toHaveBeenCalledWith('5');
    });
  });

  describe('listPipelineJobs', () => {
    it('should return pipeline jobs', async () => {
      mockClient.Jobs.all.mockResolvedValue([
        { id: 1, name: 'build', status: 'success' },
      ]);

      const result = await api.listPipelineJobs(1, 10);

      expect(result).toEqual([{ id: 1, name: 'build', status: 'success' }]);
      expect(mockClient.Jobs.all).toHaveBeenCalledWith(1, { pipelineId: 10 });
    });
  });

  describe('getJobLog', () => {
    it('should return job log content', async () => {
      mockClient.Jobs.showLog.mockResolvedValue('Job output logs');

      const result = await api.getJobLog(1, 5);

      expect(result).toBe('Job output logs');
      expect(mockClient.Jobs.showLog).toHaveBeenCalledWith(1, 5);
    });
  });

  describe('getTriggerToken', () => {
    it('should return trigger token when available', async () => {
      mockClient.PipelineTriggerTokens.all.mockResolvedValue([
        { token: 'my-token' },
      ]);

      const result = await api.getTriggerToken(1);

      expect(result).toBe('my-token');
    });

    it('should return null when no triggers exist', async () => {
      mockClient.PipelineTriggerTokens.all.mockResolvedValue([]);

      const result = await api.getTriggerToken(1);

      expect(result).toBeNull();
    });
  });
});
