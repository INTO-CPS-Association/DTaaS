# Heart Digital Twin - PaaS Edition

## Overview

This example demonstrates the use of DevOps features for the Heart Digital Twin
in a **Platform-as-a-Service (PaaS)** deployment mode. This version is
specifically designed for cloud deployment and supports multiple deployment
strategies including Render.com and GitLab CI/CD with GitHub mirroring.

## DevOps Automation

### Setup Instructions

1. **Connect GitHub Repository to Render.com**:
   - Sign up for a Render.com account
   - Connect the GitHub repository

2. **Automatic Deployment**:
   - Render.com automatically deploys on detecting changes in the GitHub
     repository

The `.gitlab-ci.yml` file provides a mirror-to-GitHub pipeline that:

- Automatically syncs changes from GitLab to a GitHub repository
- Enables GitHub-based deployments (like Render.com) to stay updated
- Requires GitLab CI/CD variables: `GITHUB_USERNAME` and `GITHUB_TOKEN`

## References

See the [Heart Digital Twin](../heart-dt/README.md) documentation for
details about the underlying cardiovascular monitoring functionality.
