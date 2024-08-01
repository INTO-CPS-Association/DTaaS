import  DigitalTwin  from '../../../src/util/gitlab';
import { Gitlab } from '@gitbeaker/rest';
import { ProjectSchema, PipelineTriggerTokenSchema } from '@gitbeaker/rest';

const mockApi = {
    Projects: {
        search: jest.fn()
    },
    PipelineTriggerTokens: {
        all: jest.fn(),
        trigger: jest.fn()
    }
};

describe('DigitalTwin', () => {
    let dt: DigitalTwin;

    beforeEach(() => {
        dt = new DigitalTwin('test-DTName');
        dt.api = mockApi as unknown as InstanceType<typeof Gitlab>;
    });

    it('should fetch project ID successfully', async () => {
        mockApi.Projects.search.mockResolvedValue([{ id: 1, name: 'test-username' } as ProjectSchema]);

        const projectId = await dt.getProjectId();

        expect(projectId).toBe(1);
    });

    it('should handle project ID not found', async () => {
        mockApi.Projects.search.mockResolvedValue([]);

        const projectId = await dt.getProjectId();

        expect(projectId).toBeNull();
    });

    it('should handle errors fetching project ID', async () => {
        mockApi.Projects.search.mockRejectedValue(new Error('API error'));

        const projectId = await dt.getProjectId();

        expect(projectId).toBeNull();
    });

    it('should fetch trigger token successfully', async () => {
        mockApi.PipelineTriggerTokens.all.mockResolvedValue([{ token: 'test-token' } as PipelineTriggerTokenSchema]);

        const token = await dt.getTriggerToken(1);

        expect(token).toBe('test-token');
        expect(mockApi.PipelineTriggerTokens.all).toHaveBeenCalledWith(1);
    });

    it('should handle no trigger tokens found', async () => {
        mockApi.PipelineTriggerTokens.all.mockResolvedValue([]);

        const token = await dt.getTriggerToken(1);

        expect(token).toBeNull();
        expect(mockApi.PipelineTriggerTokens.all).toHaveBeenCalledWith(1);
    });

    it('should handle errors fetching trigger token', async () => {
        mockApi.PipelineTriggerTokens.all.mockRejectedValue(new Error('API error'));

        const token = await dt.getTriggerToken(1);

        expect(token).toBeNull();
        expect(mockApi.PipelineTriggerTokens.all).toHaveBeenCalledWith(1);
    });

    it('should handle null project ID during pipeline execution', async () => {
        mockApi.Projects.search.mockResolvedValue([]);

        const success = await dt.execute('test-runnerTag');

        expect(success).toBe(false);
        expect(mockApi.PipelineTriggerTokens.trigger).not.toHaveBeenCalled();
    });

    it('should handle null trigger token during pipeline execution', async () => {
        mockApi.Projects.search.mockResolvedValue([{ id: 1, name: 'test-username' } as ProjectSchema]);
        mockApi.PipelineTriggerTokens.all.mockResolvedValue([]);

        const success = await dt.execute('test-runnerTag');

        expect(success).toBe(false);
        expect(mockApi.PipelineTriggerTokens.trigger).not.toHaveBeenCalled();
    });

    it('should execute pipeline successfully', async () => {
        mockApi.Projects.search.mockResolvedValue([{ id: 1, name: 'test-username' } as ProjectSchema]);
        mockApi.PipelineTriggerTokens.all.mockResolvedValue([{ token: 'test-token' } as PipelineTriggerTokenSchema]);
        mockApi.PipelineTriggerTokens.trigger.mockResolvedValue(undefined);

        const success = await dt.execute('test-runnerTag');

        expect(success).toBe(true);
        expect(mockApi.PipelineTriggerTokens.trigger).toHaveBeenCalledWith(
            1,
            'main',
            'test-token',
            { variables: { DTName: 'test-DTName', RunnerTag: 'test-runnerTag' } }
        );
        expect(dt.executionStatus()).toContain('success');
    });

    it('should handle non-Error thrown during pipeline execution', async () => {
        mockApi.Projects.search.mockResolvedValue([{ id: 1, name: 'test-username' } as ProjectSchema]);
        mockApi.PipelineTriggerTokens.all.mockResolvedValue([{ token: 'test-token' } as PipelineTriggerTokenSchema]);

        mockApi.PipelineTriggerTokens.trigger.mockRejectedValue('String error message');

        const success = await dt.execute('test-runnerTag');

        expect(success).toBe(false);
        expect(mockApi.PipelineTriggerTokens.trigger).toHaveBeenCalledWith(
            1,
            'main',
            'test-token',
            { variables: { DTName: 'test-DTName', RunnerTag: 'test-runnerTag' } }
        );
        expect(dt.executionStatus()).toContain('error');
        const logs = dt.executionLogs();
        expect(logs).toHaveLength(1);
        expect(logs[0].error).toBeInstanceOf(Error);
        expect(logs[0].error?.message).toBe('String error message');
    });

    it('should handle Error thrown during pipeline execution', async () => {
        mockApi.Projects.search.mockResolvedValue([{ id: 1, name: 'test-username' } as ProjectSchema]);
        mockApi.PipelineTriggerTokens.all.mockResolvedValue([{ token: 'test-token' } as PipelineTriggerTokenSchema]);

        mockApi.PipelineTriggerTokens.trigger.mockRejectedValue(new Error('Error instance message'));

        const success = await dt.execute('test-runnerTag');

        expect(success).toBe(false);
        expect(mockApi.PipelineTriggerTokens.trigger).toHaveBeenCalledWith(
            1,
            'main',
            'test-token',
            { variables: { DTName: 'test-DTName', RunnerTag: 'test-runnerTag' } }
        );
        expect(dt.executionStatus()).toContain('error');
        const logs = dt.executionLogs();
        expect(logs).toHaveLength(1);
        expect(logs[0].error).toBeInstanceOf(Error);
        expect(logs[0].error?.message).toBe('Error instance message');
    });

    it('should return execution logs', async () => {
        mockApi.Projects.search.mockResolvedValue([{ id: 1, name: 'test-username' } as ProjectSchema]);
        mockApi.PipelineTriggerTokens.all.mockResolvedValue([{ token: 'test-token' } as PipelineTriggerTokenSchema]);
        mockApi.PipelineTriggerTokens.trigger.mockResolvedValue(undefined);

        await dt.execute('test-runnerTag');

        const logs = dt.executionLogs();
        expect(logs).toHaveLength(1);
        expect(logs[0].status).toBe('success');
        expect(logs[0].DTName).toBe('test-DTName');
        expect(logs[0].runnerTag).toBe('test-runnerTag');
    });
});