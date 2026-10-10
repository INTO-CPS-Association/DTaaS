# Setting up GitLab Runners with Docker on Windows for DTaaS

This guide sets up and configures GitLab runners with Docker on Windows
for the DTaaS platform. The diagram shows the intended installation.

![GitLab Runner Integration](gitlab-integrated-runner.png)

## Step-by-Step Setup Process

### 1. Install GitLab Runner

Download and install GitLab Runner for Windows from
[GitLab's official download page](https://docs.gitlab.com/runner/install/windows.html).

```powershell
# Navigate to your download directory
cd C:\path\to\download\folder

# Run the GitLab Runner
.\gitlab-runner.exe install

# Start the service
.\gitlab-runner.exe start
```

### 2. Getting a token

To obtain the GitLab token, open the project page
(e.g. <https://dtaas-digitaltwin.com/gitlab/dtaas/USERNAME>) and:

1. Go to **Settings > CI/CD > Runners**.
2. Press **New Project Runner**.
3. Add the tag `linux`.
4. Leave the other settings unchanged and press **Create Runner**.
5. GitLab displays the token. Save it.

### 3. Register the Runner for DTaaS

Register the runner with the URL of the GitLab instance and the token:

```powershell
# Register the runner for DTaaS
.\gitlab-runner.exe register --url "https://intocps.org/gitlab" --token ""

# When prompted, enter:
# - Name: [Your machine name or any preferred name]
# - Executor: docker
# - Default Docker image: ruby:2.7
# - Tags: linux
```

DTaaS digital twins need a Linux environment: their pipelines run shell
scripts with commands such as `chmod +x`.

### 4. Configure the config.toml

Most of the setup happens in the `config.toml` file. It is usually at
`C:\Users\YourUsername\.gitlab-runner\config.toml`, or in the directory
where the gitlab-runner executable was installed and run.

#### DTaaS Configuration for Windows Hosts

The recommended configuration for running DTaaS digital twins on Windows
is:

```toml
concurrent = 1
check_interval = 0
connection_max_age = "15m0s"
shutdown_timeout = 0

[session_server]
  session_timeout = 1800

[[runners]]
  name = "Some name"
  url = "https://dtaas-digitaltwin.com/gitlab"
  id = 3
  token = "YOUR_RUNNER_TOKEN"
  token_obtained_at = 2025-03-17T19:50:25Z
  token_expires_at = 0001-01-01T00:00:00Z
  executor = "docker"
  [runners.custom_build_dir]
    enabled = false
  [runners.cache]
    MaxUploadedArchiveSize = 0
    [runners.cache.s3]
    [runners.cache.gcs]
    [runners.cache.azure]
  [runners.feature_flags]
    FF_NETWORK_PER_BUILD = false
  [runners.docker]
    tls_verify = false
    image = "ruby:2.7"
    privileged = false
    disable_entrypoint_overwrite = false
    oom_kill_disable = false
    disable_cache = false
    volumes = ["/cache"]
    shm_size = 0
    network_mtu = 0
  tags = ["linux"]
```

### 5. Restart the Runner

Restart the runner to apply the configuration:

```powershell
.\gitlab-runner.exe stop
.\gitlab-runner.exe start
```

## Verifying the Setup

Check that the runner is configured correctly:

```powershell
.\gitlab-runner.exe verify
```

A successful check prints something like:

```powershell
Verifying runner... is valid        runner=YourRunnerToken
```

## Understanding the DTaaS Project Setup

DTaaS runs digital twins as follows:

1. Digital twins live in the `digital_twins` directory.
2. Each digital twin has lifecycle scripts (create, execute, terminate,
   clean).
3. The GitLab CI/CD pipeline triggers these scripts based on user actions.
4. The scripts need a Linux environment.

## Common Errors

GitLab CI/CD pipelines on Windows with Docker can fail with these errors:

```env
ERROR: Failed to remove network for build
ERROR: Job failed: invalid volume specification: "c:\\cache"
```

The usual causes are:

1. An incorrect Docker executor configuration
2. Windows-style paths, which Docker does not accept
3. A mismatch between the runner's executor type and the pipeline
   requirements

Use the Docker (Linux) executor even on a Windows host, because the
digital twin scripts are written for Linux, and write volume paths in
Linux form (`/cache`).
