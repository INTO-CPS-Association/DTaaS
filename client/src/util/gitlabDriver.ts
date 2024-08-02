import GitlabInstance from './gitlab';
import DigitalTwin from './gitlabDigitalTwin';

class GitlabDriver {
    public static async run(): Promise<void> {
        const gitlabInstance = new GitlabInstance();
        console.log('GitLab username:', gitlabInstance.username);
        console.log('GitLab logs:', gitlabInstance.logs);
        console.log('GitLab subfolders:', gitlabInstance.subfolders);

        const projectId = await gitlabInstance.getProjectId() || 0;
        console.log('Project id:', projectId);

        const subfolders = await gitlabInstance.getDTSubfolders(projectId);
        console.log('Subfolders:', subfolders);

        const dtName = subfolders[0].name;
        const runnerTag = 'dtaas';

        const triggerToken = await gitlabInstance.getTriggerToken(projectId);
        console.log('Trigger token:', triggerToken);

        const digitalTwin = new DigitalTwin(dtName, gitlabInstance);
        const result = await digitalTwin.execute(runnerTag);

        console.log('Execution Result:', result);

        const lastExecutionStatus = digitalTwin.executionStatus();
        console.log('Execution Status:', lastExecutionStatus);

        const logs = gitlabInstance.executionLogs();
        console.log('Execution Logs:', logs);
    }
}

GitlabDriver.run().catch(error => {
    console.error('Error executing GitlabDriver:', error);
});

export default GitlabDriver;