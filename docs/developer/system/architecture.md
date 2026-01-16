# :european_castle: System Overview

The Digital Twin as a Service (DTaaS) platform is designed to support
the complete digital twin (DT) lifecycle, enabling users to create,
configure, execute, and share digital twins through reusable assets[1].
The platform architecture reflects established principles for realising
digital twins in practice[2], while also supporting advanced
use cases such as runtime verification of autonomous systems[3].

## User Requirements

The platform provides the following core capabilities:

1. **Author** – create different assets of the DT on the
   platform itself. This step requires use of some software
   frameworks and tools whose sole purpose is to author
   DT assets.
1. **Consolidate** – consolidate the list of available DT assets
   and authoring tools so that user can navigate the library
   of reusable assets. This functionality requires support
   for discovery of available assets.
1. **Configure** – support selection and configuration of
   DTs. This functionality also requires support for validation
   of a given configuration.
1. **Execute** – provision computing infrastructure on demand to
   support execution of a DT.
1. **Explore** – interact with a DT and explore the results
   stored both inside and outside the platform. Exploration
   may lead to analytical insights.
1. **Save** – save the state of a DT that is already in the
   execution phase. This functionality is required for on-demand
   saving and re-spawning of DTs.
1. **Services** – integrate DTs with on-platform or external
   services with which users can interact with.
1. **Share** – share a DT with other users of their organisation.

## System Architecture

The figure shows the system architecture of the the DTaaS software platform.

![System architecture](architecture.png)

### System Components

Users interact with the software platform through a web application.
The service router serves as the single point of entry for direct access
to platform services and is responsible for controlling user access to
the microservice components. The service mesh enables discovery of
microservices, load balancing, and authorization functionalities.

In addition, there are microservices for catering to managing
DT reusable assets, platform services, DT lifecycle manager,
DT execution manager, accouting and security.
The microservices are complementary and composable; they fulfil
core requirements of the system.

The microservices responsible for satisfying the user requirements are:

1. **The security microservice** implements
   role-based access control (RBAC) in the platform.
1. **The accounting microservice** is responsible for keeping track of the
   live status of platform, DT asset and infrastructure usage. Any licensing,
   usage restrictions need to be enforced by the accounting
   microservice. Accounting is a pre-requisite to commercialisation of
   the platform.
   Due to significant use of external
   infrastructure and resources via the platform, the accounting
   microservice needs to interface with accounting systems of
   the external services.
1. **User Workspaces** are virtual environments in which users can perform
   lifecycle operations on DTs. These virtual environments are either docker
   containers or virtual machines which provide desktop interface to users.
1. **Reusable Assets** are assets / parts from which DTs are created.
   Further explation is available on
   the [assets page](../../user/servers/lib/assets.md)
1. **Services** are dedicated services available to all the DTs and
   users of the DTaaS platform. Services build upon DTs and
   provide user interfaces to users.
1. **DT Execution Manager** provides virtual and isolated execution
   environments for DTs. The execution manager is also responsible
   for dynamic resource provisioning of cloud resources.
1. **DT Lifecycle Manager** manages the lifecycle operations on all DTs.
   It also directs _DT Execution Manager_ to perform execute, save and
   terminate operations on DTs.

For a more detailed view, refer to
the [C4 architectural diagram](C4-L2_diagram.png).

A mapping of the architectural components to related pages in
the documentation is available in the table.

| System Component          | Doc Page(s)                                                                                                                              |
| :------------------------ | :--------------------------------------------------------------------------------------------------------------------------------------- |
| Service Router            | [Traefik Gateway](https://github.com/INTO-CPS-Association/DTaaS/tree/feature/distributed-demo/servers/config/gateway#the-gateway-server) |
| Web Application           | [React Webapplication](../client/client.md)                                                                                              |
| Reusable Assets           | [Library Microservice](../servers/lib/lib-ms.md)                                                                                         |
| Digital Twins and DevOps  | [Integrated GitLab](../../admin/gitlab/index.md)                                                                                         |
| Platform Services         | [Third-party Services](./../../admin/services/terminal-install.md) (MQTT, InfluxDB, RabbitMQ, Grafana, PostgreSQL, and ThingsBoard                        |
| DT Lifecycle Manager      | Not available yet                                                                                                                        |
| Security                  | GitLab [client OAuth 2.0](../../admin/client/auth.md) and [server OAuth 2.0](../../admin/servers/auth.md)                                |
| Digital Twins as Services | [DT Runner](../../user/servers/execution/runner/readme.md)                                                                               |
| Accounting                | Not available yet                                                                                                                        |
| Execution Manager         | Not available yet                                                                                                                        |

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
