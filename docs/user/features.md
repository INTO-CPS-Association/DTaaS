# Overview

## Advantages

The DTaaS software platform offers:

- Support for heterogeneous Digital Twin implementations
  - CFD, Simulink, co-simulation, FEM, ROM, ML, and other paradigms
- Integration with existing Digital Twin frameworks
- Digital Twins offered as a service
- Collaboration and reuse of assets
- Private workspaces for verifying reusable assets
  and trying out DT executions
- Lower cost through shared infrastructure

## Software Features

Each installation of the DTaaS platform includes
the features shown in the following diagram.

![Features](DTaaS-user-view.png#only-light)
![Features](DTaaS-user-view-dark.png#only-dark)

Every user gets a dedicated workspace.
These workspaces are containerized Linux desktops.
The user desktops are isolated, so software installed and
customisations made in one workspace do not affect
other user workspaces.
Graphical digital twins can be executed in these private workspaces.

Each user workspace comes with pre-installed development tools,
which are accessed through a web browser.
The following tools are currently available:

| Tool                   | Advantage                                                                                                                                           |
| :--------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------- |
| Jupyter Lab            | Create and use digital twins and their components in a web browser. All native JupyterLab use cases are supported.                                  |
| Jupyter Notebook       | Manage files and library assets in a web browser.                                                                                                   |
| VS Code in the browser | A widely used IDE for software development. Digital twin assets can be developed in this environment.                                               |
| ungit                  | An interactive git client for managing repositories in a web browser.                                                                               |

In addition, an xfce-based remote desktop is accessible through a VNC
client that runs in the web browser.
Desktop software supported by xfce can also be executed in the workspace.

The workspaces have Internet access, so
Digital Twins running in a workspace can interact
with both internal and external services.

A DT automation layer manages DT automation tasks.
It creates, modifies and executes DTs on
both on-premise infrastructure and commercial cloud (DevOps) service providers.

The web client also has a [Building Models](website/bim.md) page that
draws IFC building models from the user's library and colours them by
the readings of their sensors.

The DTaaS software platform includes several pre-installed services.
The currently available services are:

| Service     | Advantage                                                                                                                                                                                                   |
| :---------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| InfluxDB    | Internet of Things (IoT) device management and data visualisation platform. This service stores data for digital twins and provides alerting capabilities.                                                  |
| RabbitMQ    | Communication broker for message exchange between physical and digital twins.                                                                                                                               |
| Grafana     | Visualisation dashboard service for presenting digital twin data.                                                                                                                                           |
| MQTT        | Lightweight data transfer broker for IoT devices and physical twins providing data to digital twins.                                                                                                        |
| MongoDB     | NoSQL document database for storing metadata from physical twins.                                                                                                                                           |
| PostgreSQL  | SQL database server for storing historical and time-series data.                                                                                                                                            |
| ThingsBoard | Internet of Things (IoT) device management and data visualisation platform.                                                                                                                                 |

Users can publish and reuse the digital twin assets
available on the platform. Digital twins can also be executed
and offered as services to external clients. These clients
do not need to be registered users of the DTaaS installation.

## References

Talasila, Prasad, et al. "Composable digital twins on Digital Twin
as a Service platform." Simulation 101.3 (2025): 287-311.
