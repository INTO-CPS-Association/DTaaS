// GitlabAPI.test.ts
import GitlabAPI from 'model/backend/gitlab/gitlabAPI';

describe('GitlabAPI', () => {
  let api: GitlabAPI;
  let mockClient: any;

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
    };
    api = new GitlabAPI('https://gitlab.example.com', 'oauth-token');
    api.client = mockClient;
  });

  describe('init', () => {
    it('resolves when a trigger token is found', async () => {
      mockClient.PipelineTriggerTokens.all.mockResolvedValue([
        { token: 'abc123' },
      ]);
      
      await expect(api.init(42)).resolves.toBeUndefined();
      expect(mockClient.PipelineTriggerTokens.all).toHaveBeenCalledWith(42);
    });

    it('throws if no trigger token is found', async () => {
      mockClient.PipelineTriggerTokens.all.mockResolvedValue([]);
      
      await expect(api.init(99)).rejects.toThrow('Trigger token not found');
    });
  });

  describe('pipeline operations', () => {
    beforeEach(async () => {
      mockClient.PipelineTriggerTokens.all.mockResolvedValue([{ token: 'test-token' }]);
      await api.init(1);
    });

    it('starts pipeline with correct parameters', async () => {
      mockClient.PipelineTriggerTokens.trigger.mockResolvedValue({ id: 555 });
      
      const result = await api.startPipeline(1, 'main', { FOO: 'bar' });
      
      expect(mockClient.PipelineTriggerTokens.trigger).toHaveBeenCalledWith(
        1,
        'main',
        'test-token',
        { variables: { FOO: 'bar' } },
      );
      expect(result).toEqual({ id: 555 });
    });

    it('starts pipeline without variables', async () => {
      mockClient.PipelineTriggerTokens.trigger.mockResolvedValue({ id: 666 });
      
      const result = await api.startPipeline(1, 'develop');
      
      expect(mockClient.PipelineTriggerTokens.trigger).toHaveBeenCalledWith(
        1,
        'develop',
        'test-token',
        { variables: undefined },
      );
      expect(result).toEqual({ id: 666 });
    });

    it('cancels pipeline and returns the result', async () => {
      mockClient.Pipelines.cancel.mockResolvedValue({ id: 777 });
      
      const result = await api.cancelPipeline(2, 777);
      
      expect(mockClient.Pipelines.cancel).toHaveBeenCalledWith(2, 777);
      expect(result).toEqual({ id: 777 });
    });

    it('gets pipeline status', async () => {
      mockClient.Pipelines.show.mockResolvedValue({ status: 'running' });
      
      const status = await api.getPipelineStatus(1, 123);
      
      expect(mockClient.Pipelines.show).toHaveBeenCalledWith(1, 123);
      expect(status).toBe('running');
    });
  });

  describe('repository file operations', () => {
    it('creates repository file', async () => {
      mockClient.RepositoryFiles.create.mockResolvedValue({});
      
      const result = await api.createRepositoryFile(
        1, 
        'test.txt', 
        'main', 
        'file content', 
        'Add test file'
      );
      
      expect(mockClient.RepositoryFiles.create).toHaveBeenCalledWith(
        1,
        'test.txt',
        'main',
        'file content',
        'Add test file'
      );
      expect(result).toEqual({ content: 'file content' });
    });

    it('edits repository file', async () => {
      mockClient.RepositoryFiles.edit.mockResolvedValue({});
      
      const result = await api.editRepositoryFile(
        1, 
        'test.txt', 
        'main', 
        'updated content', 
        'Update test file'
      );
      
      expect(mockClient.RepositoryFiles.edit).toHaveBeenCalledWith(
        1,
        'test.txt',
        'main',
        'updated content',
        'Update test file'
      );
      expect(result).toEqual({ content: 'updated content' });
    });

    it('removes repository file', async () => {
      mockClient.RepositoryFiles.remove.mockResolvedValue({});
      
      const result = await api.removeRepositoryFile(
        1, 
        'test.txt', 
        'main', 
        'Remove test file'
      );
      
      expect(mockClient.RepositoryFiles.remove).toHaveBeenCalledWith(
        1,
        'test.txt',
        'main',
        'Remove test file'
      );
      expect(result).toEqual({ content: '' });
    });

    it('gets repository file content', async () => {
      const base64Content = Buffer.from('Hello World').toString('base64');
      mockClient.RepositoryFiles.show.mockResolvedValue({
        content: base64Content
      });
      
      const result = await api.getRepositoryFileContent(1, 'test.txt', 'main');
      
      expect(mockClient.RepositoryFiles.show).toHaveBeenCalledWith(1, 'test.txt', 'main');
      expect(result.content).toBe('Hello World');
    });

    it('lists repository files with default parameters', async () => {
      const mockTreeItems = [
        { name: 'file1.txt', type: 'blob', path: 'file1.txt' },
        { name: 'folder1', type: 'tree', path: 'folder1' }
      ];
      mockClient.Repositories.allRepositoryTrees.mockResolvedValue(mockTreeItems);
      
      const result = await api.listRepositoryFiles(1);
      
      expect(mockClient.Repositories.allRepositoryTrees).toHaveBeenCalledWith(1, {
        path: '',
        recursive: false,
        ref: 'main'
      });
      expect(result).toEqual(mockTreeItems);
    });

    it('lists repository files with custom parameters', async () => {
      const mockTreeItems = [
        { name: 'nested.txt', type: 'blob', path: 'src/nested.txt' }
      ];
      mockClient.Repositories.allRepositoryTrees.mockResolvedValue(mockTreeItems);
      
      const result = await api.listRepositoryFiles(1, 'src', 'develop', true);
      
      expect(mockClient.Repositories.allRepositoryTrees).toHaveBeenCalledWith(1, {
        path: 'src',
        recursive: true,
        ref: 'develop'
      });
      expect(result).toEqual(mockTreeItems);
    });
  });

  describe('group operations', () => {
    it('gets group by name', async () => {
      const mockGroup = { id: 1, name: 'test-group' };
      mockClient.Groups.show.mockResolvedValue(mockGroup);
      
      const result = await api.getGroupByName('test-group');
      
      expect(mockClient.Groups.show).toHaveBeenCalledWith('test-group');
      expect(result).toEqual(mockGroup);
    });

    it('lists group projects', async () => {
      const mockProjects = [
        { id: 1, name: 'project1' },
        { id: 2, name: 'project2' }
      ];
      mockClient.Groups.allProjects.mockResolvedValue(mockProjects);
      
      const result = await api.listGroupProjects('group-123');
      
      expect(mockClient.Groups.allProjects).toHaveBeenCalledWith('group-123');
      expect(result).toEqual(mockProjects);
    });
  });

  describe('job operations', () => {
    it('lists pipeline jobs', async () => {
      const mockJobs = [
        { id: 1, name: 'build' },
        { id: 2, name: 'test' }
      ];
      mockClient.Jobs.all.mockResolvedValue(mockJobs);
      
      const result = await api.listPipelineJobs(1, 123);
      
      expect(mockClient.Jobs.all).toHaveBeenCalledWith(1, { pipelineId: 123 });
      expect(result).toEqual(mockJobs);
    });

    it('gets job log', async () => {
      const mockLog = 'Job log content...';
      mockClient.Jobs.showLog.mockResolvedValue(mockLog);
      
      const result = await api.getJobLog(1, 456);
      
      expect(mockClient.Jobs.showLog).toHaveBeenCalledWith(1, 456);
      expect(result).toBe(mockLog);
    });
  });

  describe('getTriggerToken', () => {
    it('returns the first trigger token when available', async () => {
      mockClient.PipelineTriggerTokens.all.mockResolvedValue([
        { token: 'first-token' },
        { token: 'second-token' }
      ]);
      
      const token = await api.getTriggerToken(1);
      
      expect(mockClient.PipelineTriggerTokens.all).toHaveBeenCalledWith(1);
      expect(token).toBe('first-token');
    });

    it('returns null when no trigger tokens are available', async () => {
      mockClient.PipelineTriggerTokens.all.mockResolvedValue([]);
      
      const token = await api.getTriggerToken(1);
      
      expect(mockClient.PipelineTriggerTokens.all).toHaveBeenCalledWith(1);
      expect(token).toBeNull();
    });

    it('returns null when triggers is null or undefined', async () => {
      mockClient.PipelineTriggerTokens.all.mockResolvedValue(null);
      
      const token = await api.getTriggerToken(1);
      
      expect(token).toBeNull();
    });
  });
});