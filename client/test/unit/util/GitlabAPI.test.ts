import GitlabAPI from 'model/backend/gitlab/backend';
import { Gitlab } from '@gitbeaker/rest';

jest.mock('@gitbeaker/rest', () => ({
  Gitlab: jest.fn().mockImplementation(() => ({})),
}));

describe('GitlabAPI', () => {
  let api: GitlabAPI;
  let mockClient: jest.Mocked<InstanceType<typeof Gitlab>>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockClient = {
      PipelineTriggerTokens: {
        all: jest.fn(),
        trigger: jest.fn(),
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
      },
    } as unknown as jest.Mocked<InstanceType<typeof Gitlab>>;
    api = new GitlabAPI('https://gitlab.example.com', 'oauth-token');
    api.client = mockClient;
  });

  describe('init', () => {
    it('initializes Gitlab client with correct config', () => {
      const host = 'https://gitlab.example.com';
      const token = 'oauth-token';

      const gitlabApi = new GitlabAPI(host, token);

      expect(gitlabApi).toBeDefined();
      expect(Gitlab).toHaveBeenCalledWith({ host, oauthToken: token });
    });
  });

  describe('pipeline operations', () => {
    beforeEach(async () => {
      (mockClient.PipelineTriggerTokens.all as jest.Mock).mockResolvedValue([
        { token: 'test-token' },
      ]);
    });

    it('throws error when starting pipeline without trigger token', async () => {
      await expect(
        api.startPipeline(4, 'testReference', { bar: 'bar' }),
      ).rejects.toThrow('Trigger token is required to start a pipeline');
    });

    it('starts pipeline with correct parameters', async () => {
      (mockClient.PipelineTriggerTokens.trigger as jest.Mock).mockResolvedValue(
        { id: 555, status: 'test-status' },
      );

      const result = await api.startPipeline(
        1,
        'main',
        { FOO: 'bar' },
        'test-token',
      );

      expect(mockClient.PipelineTriggerTokens.trigger).toHaveBeenCalledWith(
        1,
        'main',
        'test-token',
        { variables: { FOO: 'bar' } },
      );
      expect(result).toEqual({ id: 555, status: 'test-status' });
    });

    it('starts pipeline without variables', async () => {
      (mockClient.PipelineTriggerTokens.trigger as jest.Mock).mockResolvedValue(
        { id: 666, status: 'running' },
      );

      const result = await api.startPipeline(
        1,
        'develop',
        undefined,
        'test-token',
      );

      expect(mockClient.PipelineTriggerTokens.trigger).toHaveBeenCalledWith(
        1,
        'develop',
        'test-token',
        { variables: undefined },
      );
      expect(result).toEqual({ id: 666, status: 'running' });
    });

    it('cancels pipeline and returns the result', async () => {
      (mockClient.Pipelines.cancel as jest.Mock).mockResolvedValue({
        id: 777,
        status: 'canceled',
      });

      const result = await api.cancelPipeline(2, 777);

      expect(mockClient.Pipelines.cancel).toHaveBeenCalledWith(2, 777);
      expect(result).toEqual({ id: 777, status: 'canceled' });
    });

    it('gets pipeline status', async () => {
      (mockClient.Pipelines.show as jest.Mock).mockResolvedValue({
        status: 'running',
      });

      const status = await api.getPipelineStatus(1, 123);

      expect(mockClient.Pipelines.show).toHaveBeenCalledWith(1, 123);
      expect(status).toBe('running');
    });
  });

  describe('repository file operations', () => {
    it('creates repository file', async () => {
      (mockClient.RepositoryFiles.create as jest.Mock).mockResolvedValue({});

      const result = await api.createRepositoryFile(
        1,
        'test.txt',
        'main',
        'file content',
        'Add test file',
      );

      expect(mockClient.RepositoryFiles.create).toHaveBeenCalledWith(
        1,
        'test.txt',
        'main',
        'file content',
        'Add test file',
      );
      expect(result).toEqual({ content: 'file content' });
    });

    it('edits repository file', async () => {
      (mockClient.RepositoryFiles.edit as jest.Mock).mockResolvedValue({});

      const result = await api.editRepositoryFile(
        1,
        'test.txt',
        'main',
        'updated content',
        'Update test file',
      );

      expect(mockClient.RepositoryFiles.edit).toHaveBeenCalledWith(
        1,
        'test.txt',
        'main',
        'updated content',
        'Update test file',
      );
      expect(result).toEqual({ content: 'updated content' });
    });

    it('removes repository file', async () => {
      (mockClient.RepositoryFiles.remove as jest.Mock).mockResolvedValue({});

      const result = await api.removeRepositoryFile(
        1,
        'test.txt',
        'main',
        'Remove test file',
      );

      expect(mockClient.RepositoryFiles.remove).toHaveBeenCalledWith(
        1,
        'test.txt',
        'main',
        'Remove test file',
      );
      expect(result).toEqual({ content: '' });
    });

    it('gets repository file content', async () => {
      const base64Content = Buffer.from('Hello World').toString('base64');
      (mockClient.RepositoryFiles.show as jest.Mock).mockResolvedValue({
        content: base64Content,
      });

      const result = await api.getRepositoryFileContent(1, 'test.txt', 'main');

      expect(mockClient.RepositoryFiles.show).toHaveBeenCalledWith(
        1,
        'test.txt',
        'main',
      );
      expect(result.content).toBe('Hello World');
    });

    it('lists repository files with default parameters', async () => {
      const mockTreeItems = [
        { name: 'file1.txt', type: 'blob', path: 'file1.txt' },
        { name: 'folder1', type: 'tree', path: 'folder1' },
      ];
      (
        mockClient.Repositories.allRepositoryTrees as jest.Mock
      ).mockResolvedValue(mockTreeItems);

      const result = await api.listRepositoryFiles(1);

      expect(mockClient.Repositories.allRepositoryTrees).toHaveBeenCalledWith(
        1,
        {
          path: '',
          recursive: false,
          ref: 'main',
        },
      );
      expect(result).toEqual(mockTreeItems);
    });

    it('lists repository files with custom parameters', async () => {
      const mockTreeItems = [
        { name: 'readme.txt', type: 'blob', path: 'dtaas/readme.txt' },
      ];
      (
        mockClient.Repositories.allRepositoryTrees as jest.Mock
      ).mockResolvedValue(mockTreeItems);

      const result = await api.listRepositoryFiles(
        1,
        'dtaas',
        'test-ref',
        true,
      );

      expect(mockClient.Repositories.allRepositoryTrees).toHaveBeenCalledWith(
        1,
        {
          path: 'dtaas',
          recursive: true,
          ref: 'test-ref',
        },
      );
      expect(result).toEqual(mockTreeItems);
    });
  });

  describe('group operations', () => {
    it('gets group by name', async () => {
      const mockGroup = { id: 1, name: 'test-group' };
      (mockClient.Groups.show as jest.Mock).mockResolvedValue(mockGroup);

      const result = await api.getGroupByName('test-group');

      expect(mockClient.Groups.show).toHaveBeenCalledWith('test-group');
      expect(result).toEqual(mockGroup);
    });

    it('lists group projects', async () => {
      const mockProjects = [
        { id: 1, name: 'project1' },
        { id: 2, name: 'project2' },
      ];
      (mockClient.Groups.allProjects as jest.Mock).mockResolvedValue(
        mockProjects,
      );

      const result = await api.listGroupProjects('group-123');

      expect(mockClient.Groups.allProjects).toHaveBeenCalledWith('group-123');
      expect(result).toEqual(mockProjects);
    });
  });

  describe('job operations', () => {
    it('lists pipeline jobs', async () => {
      const mockJobs = [
        { id: 1, name: 'build' },
        { id: 2, name: 'test' },
      ];
      (mockClient.Jobs.all as jest.Mock).mockResolvedValue(mockJobs);

      const result = await api.listPipelineJobs(1, 123);

      expect(mockClient.Jobs.all).toHaveBeenCalledWith(1, { pipelineId: 123 });
      expect(result).toEqual(mockJobs);
    });

    it('gets job log', async () => {
      const mockLog = 'Job log content';
      (mockClient.Jobs.showLog as jest.Mock).mockResolvedValue(mockLog);

      const result = await api.getJobLog(1, 456);

      expect(mockClient.Jobs.showLog).toHaveBeenCalledWith(1, 456);
      expect(result).toBe(mockLog);
    });
  });

  describe('getTriggerToken', () => {
    it('returns the first trigger token when available', async () => {
      (mockClient.PipelineTriggerTokens.all as jest.Mock).mockResolvedValue([
        { token: 'first-token' },
        { token: 'second-token' },
      ]);

      const token = await api.getTriggerToken(1);

      expect(mockClient.PipelineTriggerTokens.all).toHaveBeenCalledWith(1);
      expect(token).toBe('first-token');
    });

    it('returns null when no trigger tokens are available', async () => {
      (mockClient.PipelineTriggerTokens.all as jest.Mock).mockResolvedValue([]);

      const token = await api.getTriggerToken(1);

      expect(mockClient.PipelineTriggerTokens.all).toHaveBeenCalledWith(1);
      expect(token).toBeNull();
    });

    it('returns null when triggers is null or undefined', async () => {
      (mockClient.PipelineTriggerTokens.all as jest.Mock).mockResolvedValue(
        null,
      );

      const token = await api.getTriggerToken(1);

      expect(token).toBeNull();
    });
  });
});
