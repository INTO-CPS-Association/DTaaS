# Gitlab Runner configuration
To properly use the Digital Twins page preview, you need to configure at least one project runner in your GitLab profile. Follow the steps below:

1. Login to the GitLab profile that will be used as the OAuth provider.

2. Navigate to the *DTaaS* group and select the project named after your GitLab username.

3. In the project menu, go to Settings and select CI/CD.

4. Expand the **Runners** section and click on *New project runner*. Follow the configuration instructions carefully. 
    * Note: you must add **linux** as a tag during configuration.

If the runners become offline during subsequent sessions, you can reactivate them via the terminal with the following command:
```bash
sudo gitlab-runner run
```