/* eslint-disable no-console */
import { GitlabInstance } from './gitlab.js';
import DigitalTwin from './gitlabDigitalTwin.js';
import config from './gitlab.json' assert { type: 'json' };

class GitlabDriver {
  public static async run(): Promise<void> {
    const gitlabInstance = new GitlabInstance(
      config.username,
      config.host,
      config.oauth_token,
    );
    console.log('GitLab username:', gitlabInstance.username);
    console.log('GitLab logs:', gitlabInstance.logs);
    console.log('GitLab subfolders:', gitlabInstance.subfolders);

    const projectId = (await gitlabInstance.getProjectId()) || 0;
    console.log('Project id:', projectId);

    const subfolders = await gitlabInstance.getDTSubfolders(projectId);
    console.log('Subfolders:', subfolders);

    const dtName = subfolders[0].name;

    const triggerToken = await gitlabInstance.getTriggerToken(projectId);
    console.log('Trigger token:', triggerToken);

    const digitalTwin = new DigitalTwin(dtName, gitlabInstance);
    const result = await digitalTwin.execute();

    console.log('Execution Result:', result);

    console.log('Last execution Status:', digitalTwin.lastExecutionStatus);

    const logs = gitlabInstance.executionLogs();
    console.log('Execution Logs:', logs);
  }
}

GitlabDriver.run().catch((error) => {
  console.error('Error executing GitlabDriver:', error);
});

export default GitlabDriver;
