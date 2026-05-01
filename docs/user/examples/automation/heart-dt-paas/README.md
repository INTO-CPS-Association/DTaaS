# Heart Digital Twin (PaaS)

## Overview

The Heart Digital Twin PaaS edition demonstrates the use of DevOps features
for the Heart Digital Twin in a **Platform-as-a-Service (PaaS)** deployment
mode. This version is designed for cloud deployment and supports multiple
deployment strategies, including Render.com and GitLab CI/CD with GitHub
mirroring.

## Example Structure

This example reuses the core Heart Digital Twin components (ECG processing,
3D heart model, anomaly detection, Flask web interface) and adds a cloud
deployment pipeline.

## Digital Twin Configuration

| Asset Type | Names of Assets | Visibility | Reuse in Other Examples |
| :--------- | :-------------------------------------- | :--------- | :---------------------- |
| Data | MIT-BIH Arrhythmia Database Records (100–109) | Public | Yes |
| Models | 3D Heart Model (Beating heart.glb) | Public | Yes |
| Functions | ECG Processing and Anomaly Detection | Public | Yes |
| Tools | Flask Web Server and UI Components | Public | Yes |

## DevOps Automation

The `.gitlab-ci.yml` file provides a mirror-to-GitHub pipeline that:

- Automatically syncs changes from GitLab to a GitHub repository.
- Enables GitHub-based deployments (such as Render.com) to stay updated.

### Required GitLab CI/CD Variables

| Variable | Description |
| :------------------ | :----------------------------------------------- |
| `GITHUB_USERNAME` | Your GitHub username |
| `GITHUB_TOKEN` | A GitHub personal access token with `repo` scope |

### Render.com Deployment

1. Sign up for a [Render.com](https://render.com) account.
2. Connect your GitHub repository to Render.com.
3. Render.com automatically deploys the application on each push.

A `render.yaml` file is included in this example to configure the
Render.com deployment settings.

## Lifecycle Phases

| Lifecycle Phase | Completed Tasks |
| --------------- | --------------------------------------------------------------- |
| Create | Sets up Python virtual environment and installs dependencies |
| Execute | Starts the Flask web server (PaaS deployment target) |
| Clean | Terminates the application and removes the virtual environment |

## Run Locally

To run the example locally before deploying to PaaS:

```bash
cd /workspace/examples/digital_twins/heart_dt_paas
chmod +x lifecycle/create lifecycle/execute lifecycle/clean
lifecycle/create
lifecycle/execute
```

The application will be available at `http://localhost:5001`.

## References

See the [Heart Digital Twin](../heart-dt/README.md) documentation for
details about the underlying cardiovascular monitoring functionality.
