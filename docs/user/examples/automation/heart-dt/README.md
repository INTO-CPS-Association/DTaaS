# Heart Digital Twin

## Overview

The Heart Digital Twin demonstrates a real-time cardiovascular monitoring system
using ECG data from the MIT-BIH Arrhythmia Database. This digital twin provides
live ECG visualisation with anomaly detection and features an interactive 3D
heart model that synchronises with the cardiac rhythm, creating an immersive
healthcare monitoring experience within the DTaaS platform.

## Example Structure

The Heart Digital Twin consists of several key components working together:

- **ECG Data Processing**: Real-time processing and visualisation of
  electrocardiogram signals from the MIT-BIH database
- **3D Heart visualisation**: Interactive 3D heart model with synchronised
  pumping animation
- **Anomaly Detection**: Real-time identification and highlighting of cardiac
  anomalies
- **Web Interface**: Flask-based web application for real-time monitoring and
  control

![Heart Digital Twin Web Interface](heart-dt.png)

## MIT-BIH Arrhythmia Database

This digital twin utilises the renowned **MIT-BIH Arrhythmia Database**, which
contains 48 half-hour excerpts of two-channel ambulatory ECG recordings. The
database includes:

- Records from 47 subjects studied by the BIH Arrhythmia Laboratory
- 360 Hz sampling frequency with 11-bit resolution
- Expert annotations for arrhythmia detection and classification
- Multiple ECG channels (MLII, V1, V2, V4, V5) depending on the record

Records 100-109 are available for simulation, each containing different types of
cardiac rhythms and anomalies for comprehensive testing and demonstration.

## Digital Twin Configuration

This example uses the following assets:

| Asset Type | Names of Assets                               | Visibility | Reuse in Other Examples |
| :--------- | :-------------------------------------------- | :--------- | :---------------------- |
| Data       | MIT-BIH Arrhythmia Database Records (100-109) | Public     | Yes                     |
| Models     | 3D Heart Model (Beating heart.glb)            | Public     | Yes                     |
| Functions  | ECG Processing & Anomaly Detection            | Public     | Yes                     |
| Tools      | Flask Web Server & UI Components              | Public     | Yes                     |

The heart digital twin can be customised through various parameters:

- **Record Selection**: Choose from records 100-109
- **Channel Selection**: Switch between available ECG channels
- **Window Size**: Adjust the time window for real-time display
- **Update Frequency**: Control the refresh rate of the simulation

## 3D Heart Animation

The digital twin features a **synchronised 3D heart pumping animation** that
enhances the monitoring experience:

- **Real-time Synchronisation**: Heart model animation matches the ECG rhythm
- **Interactive Controls**:
  - Camera controls for 360° viewing
  - Auto-rotate functionality
  - Reset view option
- **Animation Features**:
  - Realistic beating heart model
  - Smooth cardiac cycle animation
  - Pause/resume functionality synchronised with ECG simulation
- **Model Format**: High-quality GLB (GL Transmission Format Binary) 3D model
- **Rendering**: WebGL-based rendering using model-viewer component

The 3D heart provides visual feedback that correlates with the electrical
activity shown in the ECG, making it easier to understand the relationship
between electrical signals and mechanical heart function.

## Lifecycle Phases

| Lifecycle Phase | Completed Tasks                                                                                                |
| --------------- | -------------------------------------------------------------------------------------------------------------- |
| Create          | Sets up Python virtual environment and installs required dependencies (NumPy, Pandas, Matplotlib, WFDB, Flask) |
| Execute         | Starts the Flask web server and launches the heart monitoring interface accessible via web browser             |
| Clean           | Terminates the running application and removes the virtual environment                                         |

## DevOps Automation

This example demonstrates the use of DevOps features of the DTaaS platform.
GitLab DevOps pipelines are used to automate and manage its lifecycle.

### Pipeline Configuration

The `.gitlab-ci.yml` file controls the sequence of lifecycle script executions
for the heart digital twin. It defines multiple stages:

- **create**: Sets up the Python virtual environment and installs dependencies
- **execute**: Runs the heart digital twin application

### Runner Requirements

**Important**: This digital twin requires a **shell-based GitLab runner**, not a
Docker-based runner. The application needs:

- Access to the host system's Python environment
- Ability to create and manage Python virtual environments
- File system access for model loading and data processing
- Network access for the web application

Docker-based runners may restrict network or filesystem access critical to this
digital twin.

### Alternative Execution Mode: Docker

There is also an option to use **Docker-based execution** for the heart digital
twin — while still using a **shell-based GitLab runner**.

The corresponding GitLab CI file for this approach is `gitlab-ci-docker.yml`

To enable this alternative execution path, the root `.gitlab-ci.yml` must be
modified to reference this Docker-based pipeline (`gitlab-ci-docker.yml`)
instead of the default one.

### Artifacts and Outputs

This example produces:

- Heart simulation outputs
- Web application logs

These are saved as artefacts in the GitLab pipeline. The virtual environment
created in the `create` stage is also preserved as an artefact for reuse in the
`execute` stage.

## Run the example

To run the example, navigate to the following directory:

```bash
cd /workspace/examples/digital_twins/heart_dt
```

If required, change the execute permission of the lifecycle scripts to be
executed:

```bash
chmod +x lifecycle/create
chmod +x lifecycle/execute
chmod +x lifecycle/clean
```

Now, run the following scripts:

### Create

Sets up the Python environment and installs all required dependencies including
WFDB for MIT-BIH data access, Flask for the web interface, and scientific
computing libraries.

```bash
lifecycle/create
```

### Execute

Launches the Heart Digital Twin web application. The server will start and be
accessible via web browser for real-time ECG monitoring and 3D heart
visualisation.

```bash
lifecycle/execute
```

The application will be available at `http://localhost:5001` and will
automatically:

- Load required MIT-BIH records
- Initialise the ECG data processing
- Start real-time visualisation
- Enable 3D heart model Synchronisation

#### Examine the results

Access the web interface to:

- **Monitor Real-time ECG**: View live electrocardiogram signals
- **Control Simulation**: Select different records, channels, and update
  frequencies
- **Interact with 3D Heart**: Rotate, zoom, and control the heart animation
- **Detect Anomalies**: Observe highlighted cardiac irregularities
- **Pause/Resume**: Control the simulation flow

Application logs can be found in the `logs/heart_dt.log` file for debugging and
monitoring purposes.

### Clean

Terminates the running application and cleans up the environment.

```bash
lifecycle/clean
```

This will:

- Stop the Flask web server
- Remove the Python virtual environment
- Clean up any temporary files

## References

More information about the MIT-BIH Arrhythmia Database and cardiac monitoring:

```txt
Moody GB, Mark RG. The impact of the MIT-BIH Arrhythmia Database.
IEEE Eng in Med and Biol 20(3):45-50 (May-June 2001).
```

```txt
Goldberger, A., et al. PhysioBank, PhysioToolkit, and PhysioNet:
Components of a new research resource for complex physiologic signals.
Circulation 101(23):e215-e220, 2000.
```

The MIT-BIH Arrhythmia Database is available at:
[https://physionet.org/content/mitdb/](https://physionet.org/content/mitdb/)
