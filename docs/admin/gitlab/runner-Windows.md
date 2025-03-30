# Setting up GitLab Runners with Docker on Windows for DTaaS

This guide documents how to properly set up and configure GitLab runners with Docker on Windows for the Digital Twins as a Service (DTaaS) project.

## Step-by-Step Setup Process

### 1. Install GitLab Runner

Download and install GitLab Runner for Windows from [GitLab's official download page](https://docs.gitlab.com/runner/install/windows.html).

```powershell
# Navigate to your download directory
cd C:\path\to\download\folder

# Run the GitLab Runner
.\gitlab-runner.exe install

# Start the service
.\gitlab-runner.exe start
```
### 2. Getting a token
To get your GitLab token first head to your page should look something like this "https://dtaas-digitaltwin.com/gitlab/dtaas/USERNAME", then do the following:

1. settings -> CI/CD -> Runners
2. Now press "New Project Runner"
3. Add tag `linux` 
4. Leave the rest as is, and press "Create Runner" 
5. Now you get your token! SAVE IT!

You now have your runner token.
### 3. Register Your Runner for DTaaS

For the DTaaS project, you need to register your runner using the specific GitLab instance URL and token:

```powershell
# Register the runner for DTaaS
.\gitlab-runner.exe register --url "https://maestro.cps.digit.au.dk/gitlab" --token ""

# When prompted, enter:
# - Name: [Your machine name or any preferred name]
# - Executor: docker
# - Default Docker image: ruby:2.7
# - Tags: linux
```

This configuration is designed for the DTaaS digital twins which require a Linux environment to run properly. The pipelines use shell scripts with commands like `chmod +x`, which need a Linux-compatible environment.

### 4. Configure Your config.toml File for DTaaS

The most important part is properly configuring your `config.toml` file, which is typically located at `C:\Users\YourUsername\.gitlab-runner\config.toml` or in the directory where you downloaded and ran the gitlab-runner executable.

#### DTaaS Configuration for Windows Hosts

Here's the recommended configuration for running DTaaS Digital Twins on Windows:

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

### 6. Restart the Runner

After making these configuration changes, restart your runner:

```powershell
.\gitlab-runner.exe stop
.\gitlab-runner.exe start
```

## Verifying Your Setup

Run a verification check to ensure your runner is properly configured:

```powershell
.\gitlab-runner.exe verify
```

A successful verification will show something like:

```
Verifying runner... is valid        runner=YourRunnerToken
```

## Understanding the DTaaS Project Setup

The DTaaS project uses a specific structure for running digital twins:

1. Digital twins are contained in the `digital_twins` directory
2. Each digital twin has lifecycle scripts (create, execute, terminate, clean)
3. The GitLab CI/CD pipeline triggers these scripts based on user actions
4. The scripts need a Linux environment to execute properly

## Common Errors

When attempting to run GitLab CI/CD pipelines on Windows with Docker, you might encounter these errors:

```
ERROR: Failed to remove network for build
ERROR: Job failed: invalid volume specification: "c:\\cache"
```

These errors are typically caused by:

1. Incorrect Docker executor configuration
2. Windows-style path specification not being compatible with Docker
3. Mismatch between the runner's executor type and the pipeline requirements

## Conclusion

By following this guide, you should be able to properly set up GitLab runners with Docker on Windows for the DTaaS project and avoid the common configuration errors. The most crucial aspects are using the Docker (Linux) executor and properly formatting the volume paths.

Remember that for the DTaaS digital twins, using the standard Docker executor is required, even when running on a Windows host, since the scripts are designed to run in a Linux environment.