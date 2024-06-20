import DigitalTwin from '../../../src/util/gitlab';

// Mock di @gitbeaker/rest per Jest
jest.mock('@gitbeaker/rest', () => {
  const mockProjectsSearch = jest.fn().mockImplementation(async (name: string) => {
      switch (name) {
          case 'mass-spring-damper':
              return { id: 1, name: 'mass-spring-damper' };
          case 'second DT':
              return { id: 2, name: 'second DT '};
          case 'third DT':
              return { id: 3, name: 'third DT' };
          default:
              return null; // Ritorna null se non trova corrispondenze
      }
  });

  const mockGitlabConstructor = jest.fn().mockImplementation(() => ({
      Projects: {
          search: mockProjectsSearch
      },
      PipelineTriggerTokens: {
          trigger: jest.fn().mockResolvedValue({})
      }
  }));

  return {
      Gitlab: mockGitlabConstructor
  };
});


describe('DigitalTwin', () => {
    let dt: DigitalTwin;

    beforeEach(() => {
        dt = new DigitalTwin('mass-spring-damper');
        console.log(dt);
    });

    it('should fetch project ID successfully', async () => {
        const projectId = await dt.getProjectId();
        expect(projectId).toBe(1);
    });

});
