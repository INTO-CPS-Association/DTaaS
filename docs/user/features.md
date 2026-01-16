# Overview

## Advantages

The DTaaS software platform provides the following advantages:

- Support for heterogeneous Digital Twin implementations
  - CFD, Simulink, co-simulation, FEM, ROM, ML, and other paradigms
- Integration with existing Digital Twin frameworks
- Provision of Digital Twin as a Service capabilities[^1]
- Facilitation of collaboration and asset reuse
- Private workspaces for verification
  of reusable assets and trial executions of DTs
- Cost effectiveness through shared infrastructure

## Software Features

Each installation of the DTaaS platform includes
the features illustrated in the following diagram.

![Features](DTaaS-user-view.png)

All users are provided with dedicated workspaces.
These workspaces are containerized implementations of Linux Desktops.
The user desktops are isolated, ensuring that installations and
customizations performed in one workspace do not affect
other user workspaces.
Graphical digital twins can be executed within these private workspaces.

Each user workspace is provisioned with pre-installed development tools.
These tools are accessible directly through a web browser.
The following tools are currently available:

| Tool                   | Advantage                                                                                                                                           |
| :--------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------- |
| Jupyter Lab            | Enables flexible creation and use of digital twins and their components through a web browser. All native JupyterLab use cases are supported.       |
| Jupyter Notebook       | Facilitates web-based management of files and library assets.                                                                                       |
| VS Code in the browser | A widely-adopted IDE for software development. Digital twin-related assets can be developed within this environment.                                |
| ungit                  | An interactive git client enabling repository management through a web browser.                                                                     |

In addition, an xfce-based remote desktop is accessible via a VNC client.
The VNC client is available directly in the web browser.
Desktop software supported by xfce can also be executed within the workspace.

The workspaces maintain Internet connectivity, enabling
Digital Twins running in the workspace to interact
with both internal and external services.

A DT automation layer is provided for managing DT automation tasks.
This layer facilitates creation, modification, and execution of DTs on
both on-premise infrastructure and commercial cloud (DevOps) service providers.

The DTaaS software platform includes several pre-installed services.
The currently available services are:

| Service     | Advantage                                                                                                                                                                                                   |
| :---------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| InfluxDB    | Internet of Things (IoT) device management and data visualization platform. This service stores data for digital twins and provides alerting capabilities.                                                  |
| RabbitMQ    | Communication broker facilitating message exchange between physical and digital twins.                                                                                                                      |
| Grafana     | Visualization dashboard service for digital twin data presentation.                                                                                                                                         |
| MQTT        | Lightweight data transfer broker for IoT devices and physical twins providing data to digital twins.                                                                                                        |
| MongoDB     | NoSQL document database for storing metadata from physical twins.                                                                                                                                           |
| PostgreSQL  | SQL database server for storing historical and time-series data.                                                                                                                                            |
| ThingsBoard | an Internet of Things (IoT) device management and data visualization platform                                                                                                                               |

Users can publish and reuse digital twin assets
available on the platform. Additionally, digital twins can be executed
and made available as services to external clients[1]. These clients
need not be registered users of the DTaaS installation.

## References

[1]: Talasila, Prasad, et al. "Composable digital twins on Digital Twin
     as a Service platform." Simulation 101.3 (2025): 287-311.
