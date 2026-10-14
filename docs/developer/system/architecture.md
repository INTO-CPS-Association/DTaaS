# System Overview

The Digital Twin as a Service (DTaaS) platform supports the whole
digital twin (DT) lifecycle. Users create, configure, execute and share
digital twins built from reusable assets[1]. The architecture follows
established principles for realising digital twins in practice[2] and
also supports use cases such as runtime verification of autonomous
systems[3].

## User Requirements

The platform provides the following capabilities:

1. **Author**: create the assets of a DT on the platform itself. This
   requires software frameworks and tools built for authoring DT
   assets.
1. **Consolidate**: consolidate the available DT assets and authoring
   tools so that users can navigate the library of reusable assets.
   This requires support for discovering available assets.
1. **Configure**: select and configure DTs. This also requires
   validation of a given configuration.
1. **Execute**: provision computing infrastructure on demand to
   execute a DT.
1. **Explore**: interact with a DT and explore the results stored
   inside and outside the platform. Exploration may lead to analytical
   insights.
1. **Save**: save the state of a DT that is already executing. This is
   needed to save and re-spawn DTs on demand.
1. **Services**: integrate DTs with on-platform or external services
   that users can interact with.
1. **Share**: share a DT with other users of their organisation.

## System Architecture

The figure shows the system architecture of the DTaaS software platform.

![System architecture](architecture.png#only-light)
![System architecture](architecture-dark.png#only-dark)

### System Components

Users interact with the software platform through a web application.
The service router is the single point of entry for direct access to
platform services and controls user access to the microservice
components. The service mesh provides microservice discovery, load
balancing and authorization.

Further microservices manage DT reusable assets, platform services, the
DT lifecycle, DT execution, accounting and security. The microservices
are complementary and composable, and together they meet the core
requirements of the system.

The microservices responsible for the user requirements are:

1. **The security microservice** implements role-based access control
   (RBAC) in the platform.
1. **The accounting microservice** keeps track of the live status of
   the platform, DT assets and infrastructure usage. It must enforce
   any licensing and usage restrictions. Accounting is a prerequisite
   for commercialising the platform. Because the platform makes heavy
   use of external infrastructure and resources, the accounting
   microservice needs to interface with the accounting systems of
   those external services.
1. **User Workspaces** are virtual environments in which users perform
   lifecycle operations on DTs. These environments are either Docker
   containers or virtual machines that give users a desktop interface.
1. **Reusable Assets** are the parts from which DTs are created. The
   [assets page](../../user/servers/lib/assets.md) explains them
   further.
1. **Services** are available to all DTs and users of the DTaaS
   platform. Services build on DTs and provide user interfaces to
   users.
1. **DT Execution Manager** provides virtual and isolated execution
   environments for DTs. It also provisions cloud resources
   dynamically.
1. **DT Lifecycle Manager** manages the lifecycle operations on all
   DTs. It directs the _DT Execution Manager_ to execute, save and
   terminate DTs.

The web application can also carry domain-specific pages that come
from separate npm packages. [Client Extensions](extensions.md) describes
the current state and the proposed extension architecture.

Several of these components are not implemented yet; the table below
gives their status. The [architecture review](review/architecture-review.md)
describes the system as implemented.

The C4 diagram below shows the DTaaS architecture in more detail.

![C4 architectural diagram](research-overview/system-architecture-c4.png)

The table maps the architectural components to related pages in the
documentation.

<!-- markdownlint-disable MD060 -->
| System Component          | Doc Page(s)                                                                                                                     |
| :------------------------ | :------------------------------------------------------------------------------------------------------------------------------ |
| Service Router            | [Traefik Gateway](../../admin/servers/auth.md)                                                                                  |
| Web Application           | [React Web Application](../codebase/client.md)                                                                                  |
| Reusable Assets           | [Library Microservice](../codebase/lib-ms.md)                                                                                   |
| Workflow Logs             | [Logger Microservice](../../user/servers/logger/LOGGER-MS.md)                                                                   |
| Digital Twins and DevOps  | [Integrated GitLab](../../admin/gitlab/index.md)                                                                                |
| Platform Services         | [Third-party Services](./../../admin/services/cli.md) (MQTT, InfluxDB, RabbitMQ, Grafana, MongoDB, PostgreSQL, and ThingsBoard) |
| DT Lifecycle Manager      | Not available yet                                                                                                               |
| Security                  | GitLab [client OAuth 2.0](../../admin/client/auth.md) and [server OAuth 2.0](../../admin/servers/auth.md)                       |
| Digital Twins as Services | [DT Runner](../../user/servers/execution/runner/readme.md)                                                                      |
| Accounting                | Not available yet                                                                                                               |
| Execution Manager         | Not available yet                                                                                                               |
<!-- markdownlint-enable MD060 -->

## References

Font sources: [fileformat](https://www.fileformat.info)

[1]: Talasila, Prasad, et al. "Composable digital twins on Digital Twin
     as a Service platform." Simulation 101.3 (2025): 287-311.

[2]: Talasila, Prasad, et al. "Realising digital twins." The engineering of
     digital twins. Cham: Springer International Publishing, 2024. 225-256.

[3]: Kristensen, Morten Haahr, et al. "Runtime Verification of Autonomous Systems
     Utilizing Digital Twins as a Service." 2024 IEEE International Conference on
     Autonomic Computing and Self-Organizing Systems Companion (ACSOS-C).
     IEEE, 2024.
