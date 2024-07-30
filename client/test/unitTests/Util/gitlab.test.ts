import DigitalTwin from '../../../src/util/gitlab'; // Aggiorna il percorso in base alla tua struttura
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
        dt = new DigitalTwin('test-project', mockApi);
    });

    it('should fetch project ID successfully', async () => {
        mockApi.Projects.search.mockResolvedValue([{ id: 1, name: 'test-project' } as ProjectSchema]);

        const projectId = await dt.getProjectId();

        expect(projectId).toBe(1);
        expect(mockApi.Projects.search).toHaveBeenCalledWith('test-project');
    });

    it('should handle project ID not found', async () => {
        mockApi.Projects.search.mockResolvedValue([]);

        const projectId = await dt.getProjectId();

        expect(projectId).toBeNull();
        expect(mockApi.Projects.search).toHaveBeenCalledWith('test-project');
    });

    it('should handle errors fetching project ID', async () => {
        mockApi.Projects.search.mockRejectedValue(new Error('API error'));

        const projectId = await dt.getProjectId();

        expect(projectId).toBeNull();
        expect(mockApi.Projects.search).toHaveBeenCalledWith('test-project');
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
        const parameters = new Map<string, string>([['DTName', 'digital_twin_name']]);
        
        const success = await dt.execute(parameters);

        expect(success).toBe(false);
        expect(mockApi.PipelineTriggerTokens.trigger).not.toHaveBeenCalled(); // Verifica che non sia stata chiamata
    });

    it('should handle null trigger token during pipeline execution', async () => {
        mockApi.Projects.search.mockResolvedValue([{ id: 1, name: 'test-project' } as ProjectSchema]);
        mockApi.PipelineTriggerTokens.all.mockResolvedValue([]);
        const parameters = new Map<string, string>([['DTName', 'digital_twin_name']]);
        
        const success = await dt.execute(parameters);

        expect(success).toBe(false);
        expect(mockApi.PipelineTriggerTokens.trigger).not.toHaveBeenCalled(); // Verifica che non sia stata chiamata
    });

    it('should execute pipeline successfully', async () => {
        mockApi.Projects.search.mockResolvedValue([{ id: 1, name: 'test-project' } as ProjectSchema]);
        mockApi.PipelineTriggerTokens.all.mockResolvedValue([{ token: 'test-token' } as PipelineTriggerTokenSchema]);
        mockApi.PipelineTriggerTokens.trigger.mockResolvedValue(undefined);

        const parameters = new Map<string, string>([['DTName', 'digital_twin_name'], ['RunnerTag', 'runner_tag']]);
        const success = await dt.execute(parameters);

        expect(success).toBe(true);
        expect(mockApi.PipelineTriggerTokens.trigger).toHaveBeenCalledWith(
            1,
            'main',
            'test-token',
            { variables: { DTName: 'digital_twin_name', RunnerTag: 'runner_tag' } }
        );
        expect(dt.executionStatus()).toContain('success');
    });

    it('should handle pipeline execution failure', async () => {
        mockApi.Projects.search.mockResolvedValue([{ id: 1, name: 'test-project' } as ProjectSchema]);
        mockApi.PipelineTriggerTokens.all.mockResolvedValue([{ token: 'test-token' } as PipelineTriggerTokenSchema]);
        mockApi.PipelineTriggerTokens.trigger.mockRejectedValue(new Error('Trigger failed'));

        const parameters = new Map<string, string>([['DTName', 'digital_twin_name'], ['RunnerTag', 'runner_tag']]);
        const success = await dt.execute(parameters);

        expect(success).toBe(false);
        expect(mockApi.PipelineTriggerTokens.trigger).toHaveBeenCalledWith(
            1,
            'main',
            'test-token',
            { variables: { DTName: 'digital_twin_name', RunnerTag: 'runner_tag' } }
        );
        expect(dt.executionStatus()).toContain('error');
        expect(dt.executionLogs()[0].error).toBeInstanceOf(Error);
        expect(dt.executionLogs()[0].error.message).toBe('Trigger failed');
    });

    it('should return execution logs', async () => {
        mockApi.Projects.search.mockResolvedValue([{ id: 1, name: 'test-project' } as ProjectSchema]);
        mockApi.PipelineTriggerTokens.all.mockResolvedValue([{ token: 'test-token' } as PipelineTriggerTokenSchema]);
        mockApi.PipelineTriggerTokens.trigger.mockResolvedValue(undefined);

        const parameters = new Map<string, string>([['DTName', 'digital_twin_name']]);
        await dt.execute(parameters);

        const logs = dt.executionLogs();
        expect(logs).toHaveLength(1);
        expect(logs[0].status).toBe('success');
        expect(logs[0].parameters).toEqual(parameters);
    });
});
