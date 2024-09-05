# Gitlab Runner configuration

To properly use the Digital Twins page preview, you need to configure at least
one project runner in your GitLab profile. Follow the steps below:

1. Login to the GitLab profile that will be used as the OAuth provider.

1. Navigate to the *DTaaS* group and select the project named after your
   GitLab username.

1. In the project menu, go to Settings and select CI/CD.

1. Expand the **Runners** section and click on *New project runner*. Follow the
   configuration instructions carefully:
   - Add **linux** as a tag during configuration.
   - Click on *Create runner*.
   - Ensure GitLab Runner is installed before proceeding. Depending on your
     environment, you will be shown the correct command to install GitLab Runner.
   - Once GitLab Runner is installed, follow these steps to register the runner:
     - Copy and paste the command shown in the GitLab interface into your command
       line to register the runner. It includes a URL and a token for your specific
       GitLab instance.
     - Choose *docker* as executor when prompted by the command line.
     - Choose the default docker image. You must use an image based on Linux,
       like the default one (*ruby:2.7*).

You can manually verify that the runner is available to pick up jobs by running
the following command:

```bash
sudo gitlab-runner run
```

It can also be used to reactivate offline runners during subsequent sessions.