# Structural Health Monitoring

## Overview

This example demonstrates the use of digital twin methodology for
structural health monitoring (SHM). A digital twin workflow has been
developed for SHM use cases, automating data ingestion, system
identification, and model update via GitLab CI/CD pipelines.

![DT Workflow](https://raw.githubusercontent.com/INTO-CPS-Association/DTaaS-examples/devops/digital_twins/shm/dt-workflow.png)

The complete source code for this example is
[available online](https://github.com/INTO-CPS-Association/example-shm).

## Example Structure

This digital twin consists of:

- **SHM package**: implements the digital twin workflow, including recorded
  data from a physical twin and replay functions that stream data into the
  workflow.
- **replay.json**: MQTT configuration file for replaying the recorded data.

## Digital Twin Configuration

| Asset Type | Names of Assets | Visibility | Reuse in Other Examples |
| :--------- | :-------------- | :--------- | :---------------------- |
| Data | Recorded accelerometer readings | Private | No |
| Functions | SHM package (example_shm wheel) | Private | No |
| Tool | Python 3.12 | Common | Yes |

## Lifecycle Phases

| Lifecycle Phase | Completed Tasks |
| --------------- | --------------------------------------------------------------- |
| Create | Installs the SHM Python package and its dependencies |
| Execute | Runs system identification and model update; publishes results |
| Clean | Removes installed packages and clears output files |

## DevOps Automation

The `.gitlab-ci.yml` file runs the lifecycle scripts automatically.
The configured scenario demonstrates system identification and model update.
Execution logs and outputs are saved as GitLab pipeline artifacts.

## Run the Example

To run the example, change your present directory:

```bash
cd /workspace/examples/digital_twins/shm
```

If required, change the execute permission of lifecycle scripts:

```bash
chmod +x lifecycle/sysid_print
```

Configure MQTT credentials in `replay.json` before running. A public
[test server](https://test.mosquitto.org/) can be used if a local
MQTT broker is unavailable.

### Execute

```bash
lifecycle/sysid_print
```

A truncated sample output during automated execution:

```log
pyoma2.setup.base - INFO - Running SSIcovmm_mt...
...
Updated parameters are:
k_rot: 12.04591179878987
m: 0.0
Model frequencies: [4.14 26.69 80.23 164.67 180.38 326.71] [Hz]
[DONE].
```

## References

1. This example corresponds to
   [commit ce47244](https://github.com/INTO-CPS-Association/example-shm/tree/ce4724457b9c11f2513026d4009ca41b2bba489a)
   of the [example-shm repository](https://github.com/INTO-CPS-Association/example-shm).
2. Talasila, P., Tcherniak, D., Jensen, A. M. D., et al. (2025).
   Structural Health Monitoring of Engineering Structures Using Digital Twins:
   A Digital Twin Platform Approach. In EVACES 2025. Springer.
