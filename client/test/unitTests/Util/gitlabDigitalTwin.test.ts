import { ProjectSchema, PipelineTriggerTokenSchema } from '@gitbeaker/rest';
import DigitalTwin from 'util/gitlabDigitalTwin';
import GitlabInstance from 'util/gitlab';

type LogEntry = { status: string; DTName: string; runnerTag: string };  

const mockApi = {
    Groups: {
        show: jest.fn(),
        allProjects: jest.fn(),
    },
    PipelineTriggerTokens: {
        all: jest.fn(),
        trigger: jest.fn(),
    },
    Repositories: {
        allRepositoryTrees: jest.fn(),
    },
};

const mockGitlabInstance = {
    api: mockApi as unknown as GitlabInstance['api'],
    executionLogs: jest.fn() as jest.Mock<LogEntry[]>,
    getProjectId: jest.fn(),
    getTriggerToken: jest.fn(),
    getDTSubfolders: jest.fn(),
    logs: [],
} as unknown as GitlabInstance;

describe('DigitalTwin', () => {
    let dt: DigitalTwin;

    beforeEach(() => {
        dt = new DigitalTwin('test-DTName', mockGitlabInstance);
    });

    it('should handle null project ID during pipeline execution', async () => {
        mockApi.Groups.show.mockResolvedValue({ id: 1, name: 'DTaaS' });
        mockApi.Groups.allProjects.mockResolvedValue([]);
        (mockGitlabInstance.getProjectId as jest.Mock).mockResolvedValue(null);
        
        const success = await dt.execute('test-runnerTag');
        
        expect(success).toBe(false);
        expect(dt.executionStatus()).toBe('error');
        expect(mockApi.PipelineTriggerTokens.trigger).not.toHaveBeenCalled();
    });    

    it('should handle null trigger token during pipeline execution', async () => {
        mockApi.Groups.show.mockResolvedValue({ id: 1, name: 'DTaaS' });
        mockApi.Groups.allProjects.mockResolvedValue([{ id: 1, name: 'user1' } as ProjectSchema]);
        mockApi.PipelineTriggerTokens.all.mockResolvedValue([]);
        (mockGitlabInstance.getTriggerToken as jest.Mock).mockResolvedValue(null);

        const success = await dt.execute('test-runnerTag');

        expect(success).toBe(false);
        expect(dt.executionStatus()).toBe('error');
        expect(mockApi.PipelineTriggerTokens.trigger).not.toHaveBeenCalled();
    });

    it('should execute pipeline successfully', async () => {
        mockApi.Groups.show.mockResolvedValue({ id: 1, name: 'DTaaS' });
        mockApi.Groups.allProjects.mockResolvedValue([{ id: 1, name: 'user1' } as ProjectSchema]);
        mockApi.PipelineTriggerTokens.all.mockResolvedValue([{ token: 'test-token' } as PipelineTriggerTokenSchema]);
        (mockGitlabInstance.getProjectId as jest.Mock).mockResolvedValue(1);
        (mockGitlabInstance.getTriggerToken as jest.Mock).mockResolvedValue('test-token');
        (mockApi.PipelineTriggerTokens.trigger as jest.Mock).mockResolvedValue(undefined);

        const success = await dt.execute('test-runnerTag');

        expect(success).toBe(true);
        expect(dt.executionStatus()).toBe('success');
        expect(mockApi.PipelineTriggerTokens.trigger).toHaveBeenCalledWith(
            1,
            'main',
            'test-token',
            { variables: { DTName: 'test-DTName', RunnerTag: 'test-runnerTag' } }
        );
    });

    it('should handle non-Error thrown during pipeline execution', async () => {
        mockApi.Groups.show.mockResolvedValue({ id: 1, name: 'DTaaS' });
        mockApi.Groups.allProjects.mockResolvedValue([{ id: 1, name: 'user1' } as ProjectSchema]);
        mockApi.PipelineTriggerTokens.all.mockResolvedValue([{ token: 'test-token' } as PipelineTriggerTokenSchema]);
        (mockGitlabInstance.getProjectId as jest.Mock).mockResolvedValue(1);
        (mockGitlabInstance.getTriggerToken as jest.Mock).mockResolvedValue('test-token');
        (mockApi.PipelineTriggerTokens.trigger as jest.Mock).mockRejectedValue('String error message');

        const success = await dt.execute('test-runnerTag');

        expect(success).toBe(false);
        expect(dt.executionStatus()).toBe('error');
        expect(mockApi.PipelineTriggerTokens.trigger).toHaveBeenCalledWith(
            1,
            'main',
            'test-token',
            { variables: { DTName: 'test-DTName', RunnerTag: 'test-runnerTag' } }
        );
    });

    it('should handle Error thrown during pipeline execution', async () => {
        mockApi.Groups.show.mockResolvedValue({ id: 1, name: 'DTaaS' });
        mockApi.Groups.allProjects.mockResolvedValue([{ id: 1, name: 'user1' } as ProjectSchema]);
        mockApi.PipelineTriggerTokens.all.mockResolvedValue([{ token: 'test-token' } as PipelineTriggerTokenSchema]);
    
        mockApi.PipelineTriggerTokens.trigger.mockRejectedValue(new Error('Error instance message'));
    
        const success = await dt.execute('test-runnerTag');
    
        expect(success).toBe(false);
    
        expect(dt.executionStatus()).toBe('error');
    });
    
    it('should return execution logs', async () => {
        mockApi.Groups.show.mockResolvedValue({ id: 1, name: 'DTaaS' });
        mockApi.Groups.allProjects.mockResolvedValue([{ id: 1, name: 'user1' } as ProjectSchema]);
        mockApi.PipelineTriggerTokens.all.mockResolvedValue([{ token: 'test-token' } as PipelineTriggerTokenSchema]);
        mockApi.PipelineTriggerTokens.trigger.mockResolvedValue(undefined);

        await dt.execute('test-runnerTag');

        (mockGitlabInstance.executionLogs as jest.Mock).mockReturnValue([
            { status: 'success', DTName: 'test-DTName', runnerTag: 'test-runnerTag' }
        ]);

        const logs = dt.gitlabInstance.executionLogs();
        expect(logs).toHaveLength(1);
        expect(logs[0].status).toBe('success');
        expect(logs[0].DTName).toBe('test-DTName');
        expect(logs[0].runnerTag).toBe('test-runnerTag');
    });
});
