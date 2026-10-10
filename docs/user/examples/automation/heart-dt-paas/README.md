# Heart Digital Twin - PaaS Edition

## Overview

This example runs the Heart Digital Twin in a
**Platform-as-a-Service (PaaS)** deployment mode. This version is meant
for cloud deployment and supports more than one deployment strategy,
including Render.com and GitLab CI/CD with GitHub mirroring.

## DevOps Automation

### Setup Instructions

1. **Connect GitHub Repository to Render.com**:
   - Sign up for a Render.com account
   - Connect the GitHub repository

2. **Automatic Deployment**:
   - Render.com deploys automatically when it detects changes in the GitHub
     repository

The `.gitlab-ci.yml` file provides a mirror-to-GitHub pipeline that:

- Syncs changes from GitLab to a GitHub repository
- Keeps GitHub-based deployments, such as Render.com, up to date
- Requires the GitLab CI/CD variables `GITHUB_USERNAME` and `GITHUB_TOKEN`

## References

See the [Heart Digital Twin](../heart-dt/README.md) documentation for
details of the underlying cardiovascular monitoring functionality.
