# Heart Digital Twin

## Overview

The Heart Digital Twin demonstrates a real-time cardiovascular monitoring
system using ECG data from the MIT-BIH Arrhythmia Database. This digital
twin provides live ECG visualization with anomaly detection and features
an interactive 3D heart model that synchronizes with the cardiac rhythm,
creating an immersive healthcare monitoring experience within the DTaaS
platform.

## Example Structure

The Heart Digital Twin consists of the following components:

- **ECG Data Processing**: Real-time processing and visualization of
  electrocardiogram signals from the MIT-BIH database.
- **3D Heart Visualization**: Interactive 3D heart model with synchronized
  pumping animation.
- **Anomaly Detection**: Real-time identification and highlighting of
  cardiac anomalies.
- **Web Interface**: Flask-based web application for real-time monitoring
  and control.

## Digital Twin Configuration

| Asset Type | Names of Assets | Visibility | Reuse in Other Examples |
| :--------- | :-------------------------------------- | :--------- | :---------------------- |
| Data | MIT-BIH Arrhythmia Database Records (100–109) | Public | Yes |
| Models | 3D Heart Model (Beating heart.glb) | Public | Yes |
| Functions | ECG Processing and Anomaly Detection | Public | Yes |
| Tools | Flask Web Server and UI Components | Public | Yes |

## Lifecycle Phases

| Lifecycle Phase | Completed Tasks |
| --------------- | --------------------------------------------------------------- |
| Create | Sets up Python virtual environment and installs dependencies |
| Execute | Starts the Flask web server and heart monitoring interface |
| Clean | Terminates the application and removes the virtual environment |

## DevOps Automation

The `.gitlab-ci.yml` file defines two stages: `create` and `execute`.
This digital twin requires a **shell-based GitLab runner** because the
application needs:

- Access to the host system's Python environment.
- Ability to create and manage Python virtual environments.
- File system access for model loading and data processing.
- Network access for the web application.

An alternative Docker-based execution path is available via
`gitlab-ci-docker.yml`. To enable it, update the root `.gitlab-ci.yml`
to reference that file instead.

## Run the Example

To run the example, change your present directory:

```bash
cd /workspace/examples/digital_twins/heart_dt
```

If required, change the execute permission of lifecycle scripts:

```bash
chmod +x lifecycle/create
chmod +x lifecycle/execute
chmod +x lifecycle/clean
```

### Create

Sets up the Python environment and installs all required dependencies,
including WFDB for MIT-BIH data access and Flask for the web interface.

```bash
lifecycle/create
```

### Execute

Launches the Heart Digital Twin web application.

```bash
lifecycle/execute
```

The application will be available at `http://localhost:5001`.
It automatically loads the required MIT-BIH records, initializes
ECG data processing, and starts real-time visualization.

### Clean

Terminates the application and removes the virtual environment.

```bash
lifecycle/clean
```

## References

The MIT-BIH Arrhythmia Database contains 48 half-hour excerpts of
two-channel ambulatory ECG recordings from 47 subjects, sampled at
360 Hz with expert arrhythmia annotations.
Records 100–109 are used for simulation in this example.
