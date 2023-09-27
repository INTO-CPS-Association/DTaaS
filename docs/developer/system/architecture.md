# System Overview

## User Requirements

The DTaaS software platform users expect a single platform
to support the complete DT lifecycle. To be more precise, the platform users expect the following features:

1. **Author** – create different assets of the DT on the
platform itself. This step requires use of some software
frameworks and tools whose sole purpose is to author
DT assets.
1. **Consolidate** – consolidate the list of available DT assets
and authoring tools so that user can navigate the library
of reusable assets. This functionality requires support
for discovery of available assets.
1. **Configure** – support selection and configuration of
DTs. This functionality also requires support for validation of a given configuration.
1. **Execute** – provision computing infrastructure on demand to support execution of a DT.
1. **Explore** – interact with a DT and explore the results
stored both inside and outside the platform. Exploration
may lead to analytical insights.
1. **Save** – save the state of a DT that’s already in the
execution phase. This functionality is required for ondemand saving and re-spawning of DTs.
1. **What-if analysis** – explore alternative scenarios to (i)
plan for an optimal next step, (ii) recalibrate new DT
assets, (iii) automated creation of new DTs or their
assets; these newly created DT assets may be used to
perform scientifically valid experiments.
1. **Share** – share a DT with other users of their organisation.

## System Architecture

![System architecture](architecture.png)

## System Components

The figure shows the system architecture of the the DTaaS software platform. The main domains of this architecture are:

1. [The Website](./client.md)

2. [The Gateway](https://github.com/INTO-CPS-Association/DTaaS/tree/feature/distributed-demo/servers/config/gateway#the-gateway-server) - This is the single point of entry for direct access to the platform services. The gateway is responsible for controlling user access to the microservice components.

3. [The Library Microservice (Reusable Assets)](./lib-ms.md)

## C4 Architectural Diagrams

The C4 architectural diagrams of the DTaaS software are presented here.

### Level 1

This Level 1 diagram only shows the users and the roles they play in the DTaaS software.

![Alt text](c4l1.png)

### Level 2

This Level 2 diagram shows the software containers of the DTaaS software.

![Detailed C4 architecture](c4l3.png)

A mapping of containers to system components is also available in the table.

| System Component | Container(s) |
|:---|:---|
| Gateway | Service Router |
| Unified Interface | React Webapplication |
| Reusable Assets | Library Microservice |
| Data | MQTT, InfluxDB, and RabbitMQ (not shown in the C4 Level 2 diagram) |
| Visualization | InfluxDB (not shown in the C4 Level 2 diagram) |
| DT Lifecycle | DT Lifecycle Manager and DT Configuration Validator |
| Security | Gitlab |
| Accounting | None |
| Execution Manager | Execution Manager |
