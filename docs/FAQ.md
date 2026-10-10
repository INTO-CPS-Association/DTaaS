# Frequently Asked Questions

## Abbreviations

| Term  | Full Form                 |
| :---- | :------------------------ |
| DT    | Digital Twin              |
| DTaaS | Digital Twin as a Service |
| PT    | Physical Twin             |

## General Questions

<!-- markdownlint-disable-file MD046 MD013 -->

??? Question "What is the DTaaS platform?"

    The DTaaS platform is a software platform for creating and running digital twins.
    The [features](user/features.md) page gives
    an overview of what DTaaS can do.

??? Question "What is the scope and current capabilities of the DTaaS platform?"

    1. DTaaS is a web-based interface for invoking the tools
       needed to work with one or more DTs.
    1. DTaaS lets users run DTs in their private workspaces.
       These user workspaces are based on the Ubuntu 20.04
       operating system.
    1. DTaaS can help create reusable DT assets only if the DT
       asset authoring tools
       run in the Ubuntu 20.04 xfce desktop environment.
    1. From the DTaaS platform's perspective, DTs are executables.
       Users are free to work with DTs in whatever way suits them.
       DTaaS suggests creating DTs from reusable assets and offers
       a suggested structure for DTs. The [examples](./user/examples/index.md)
       show the DTaaS workflow in more detail.
       This suggested workflow is not mandatory.
    1. DTs can run as services with a REST API from within user workspaces,
       which makes service-level DT composition possible.

??? Question "What can not be done inside the DTaaS platform?"

    1. DTaaS does not help install DTs obtained from external sources.
    1. Windows-only tools cannot run inside DTaaS workspaces.

??? Question "Is there any fundamental difference between commercial solutions like Ansys Twin Builder and the DTaaS platform?"

    Commercial DT platforms like _Ansys Twin Builder_ integrate models,
    simulation and sensors tightly. This leaves fewer choices in
    DT design and implementation, and it brings vendor lock-in.
    DTaaS, on the other hand, lets users split a DT into reusable assets
    and combine these assets flexibly.

??? Question "Is licensed software such as Matlab provided?"

    Proprietary and commercially licensed software is not
    available on the platform by default.
    However, each user has a private workspace based
    on a Linux xfce desktop environment.
    Users can install proprietary and commercially licensed
    software in their workspaces. A
    [screencast](FAQ/matlab-simulink.mp4) shows Matlab Simulink
    running within the DTaaS platform.
    Licensed software installed by one user is not available
    to other users.

## Digital Twin Assets

??? Question "Can the DTaaS platform be used to create new DT assets?"

    The core purpose of DTaaS is to help users
    create DTs from assets already available in the library.
    ![Create Library Assets](./user/servers/lib/author.png)
    However, users can use the services available in their
    workspace to install asset authoring tools there.
    These authoring tools can then be used to create and publish new assets.
    User workspaces are private and are not shared with other users.
    Thus, any licensed software tools installed in a workspace are
    only available to that user.

## Digital Twin Models

??? Question "Can the DTaaS platform create new DT models?"

    DTaaS is not a model creation tool, and it does not create digital twin
    models itself. It can still help users create them: model creation tools
    can be placed inside DTaaS, and any Linux desktop or terminal tool
    can run inside DTaaS. Thus, models can be created
    inside DTaaS and executed using tools that run on Linux.
    Windows-only tools cannot run in DTaaS.

??? Question "How can the DTaaS platform help to design geometric model? Does it support 3D modelling and simulation?"

    DTaaS by itself does not produce any models. It provides
    a platform and an ecosystem of services that let digital twins
    run as services. Since each user has a Linux OS at their disposal,
    they can also run digital twins that have a graphical interface.
    In short, the DTaaS platform is neither a modelling nor a
    simulation tool. If such tools are required, they must be brought onto
    the platform. For example, if Matlab is needed, the user must bring
    the licensed Matlab software.

??? Question "Can the DTaaS platform support only the information models (or behavioural models) or some other kind of models?"

    The DTaaS platform is agnostic to the kind of models used. DTaaS can
    run all kinds of models, including behavioural and data models.
    As long as the models and matching solvers can run on a
    Linux OS, they can be used in DTaaS.
    In some cases, models and solvers (tools) are bundled together
    to form monolithic DTs. The DTaaS platform can run
    such DTs as well.
    DTaaS does not provide dedicated solvers. If a solver can be
    installed in the workspace, the platform does not need to provide one.

??? Question "Does it support XML-based representation and ontology representation?"

    Not at present. **The team is looking for users who need this capability.**
    **Given concrete requirements and an example, the team can discuss**
    **how to realise it in DTaaS**.

## Communication Between Physical Twin and Digital Twin

??? Question "How can the DTaaS platform control the physical entity? Which technologies it uses for controlling the physical world?"

    At an abstract level, data flows from the physical entity
    to the digital entity and back to the physical entity. The person
    designing the digital entity decides how this communication happens.
    DTaaS provides communication services that make this
    communication easier.
    The InfluxDB and RabbitMQ services hosted on DTaaS may be used for
    two-way communication between digital and physical entities.
    RabbitMQ has its MQTT plugin enabled, so it also works as an MQTT broker.

??? Question "How is a physical entity such as shape, size, weight, structure, or chemical attributes measured using DTaaS? Is any specific technology used in this case?"

    The measurements are made at the physical twin and then
    sent to the digital twin. A digital twin platform like
    DTaaS can only facilitate the communication of these measurements
    from the physical twin. DTaaS provides InfluxDB and RabbitMQ
    (which also acts as an MQTT broker) for this purpose. These are among
    the most widely used services for digital twin communication.
    DTaaS also permits the use of other communication
    technologies and services hosted elsewhere on the Internet.

??? Question "How can real-time data differ from static data and what is the procedure to identify dynamic data? Is there any UI or specific tool used here?"

    The DTaaS platform cannot tell whether data is static or dynamic.
    It can store names, units and any other text description
    of the quantities of interest (weight of batter, voltage output, etc.).
    It can also store the data sent by the physical twin.
    The user has to make the distinction between static and dynamic data.
    Only metadata can reveal more about
    the nature of the data. A tool may help in very specific cases,
    but it still needs metadata. If a person makes this distinction,
    the need for metadata goes down but does not go away entirely.
    Some manufacturer-supported DT platforms tightly integrate
    data and model. In such cases, the tool itself
    manages the metadata. DTaaS is a generic platform for
    running digital twins. If a tool runs on
    a Linux desktop or command line, DTaaS can support it.
    The tool (e.g., Matlab) can then manage the metadata requirements itself.

## Digital Twin DevOps Automation

??? Question "Can a DT execute forever?"

    The web UI imposes a 10-minute timeout on an execution. Users can
    also terminate an execution manually. The best option is for
    a DT to run a terminate script, which ends
    the execution and returns the logs.

??? Question "Is the DT execution really scalable?"

    The capacity of the DT execution infrastructure depends on
    GitLab and on the compute power available to the GitLab
    runners. GitLab itself does not limit the
    number of runners.

??? Question "If many GitLab runners are attached to a GitLab repository, which one is used?"

    This is indeterminate. The order and location of a DT's
    execution cannot be relied on.

## Data Management

??? Question "Can the DTaaS platform collect data directly from sensors?"

    Yes, via the platform services.

??? Question "Does DTaaS support data collection from different sources like hardware, software and network? Is there any user interface or any tracking instruments used for data collection?"

    The DTaaS platform provides InfluxDB, PostgreSQL, RabbitMQ, MQTT, MongoDB
    and ThingsBoard services. Both the physical twin
    and the digital twin can use these services to communicate.
    IoT (time-series) data can be collected using the InfluxDB and MQTT
    broker services. InfluxDB has a user interface for analysing
    the collected data.
    Users can also upload their own data files into DTaaS.

??? Question "Is the DTaaS platform able to transmit data to cloud in real time?"

    Yes, via the platform services.

??? Question "Which transmission protocol does the DTaaS platform allow?"

    InfluxDB, RabbitMQ, MQTT and anything else that can be used from
    cloud service providers.

??? Question "Does the DTaaS platform support multisource information and combined multi sensor input data? Can it provide analysis and decision-supporting inferences?"

    Information from multiple sources can be stored. The InfluxDB
    service hosted on DTaaS has the Influx / Flux query
    language for sensor fusion, analysis and inference.

??? Question "Which kinds of visualisation technologies can the DTaaS platform support (e.g. graphical, geometry, image, VR/AR representation)?"

    Graphical, geometric and image visualisation. If the visualisation needs
    specific licensed software, the user must provide the licence for it.
    DTaaS does not support AR/VR.

## Platform Native Services on the DTaaS Platform

??? Question "Is the DTaaS platform able to detect the anomalies about-to-fail components and prescribe solutions?"

    This is the job of a digital twin. If a ready-to-use digital twin
    exists for this purpose, DTaaS lets others use it.
    Anomaly detection can be done with platform services
    such as Grafana, ThingsBoard and InfluxDB.

## Comparison with other DT Platforms

??? Question "All the DT platforms seem to provide different features. Is there a comparison chart?"

    Here is a qualitative comparison of DT integration platforms:

    Legend: high performance (**H**), mid performance (**M**)
    and low performance (**L**)

| DT Platforms               | License                | DT Development Process | Connectivity | Security | Processing power, performance and Scalability | Data Storage | Visualisation | Modelling and Simulation |
| :------------------------- | :--------------------- | :--------------------- | :----------- | :------- | :-------------------------------------------- | :----------- | :------------ | :----------------------- |
| Microsoft Azure DT         | Commercial Cloud       | H                      | H            | H        | M                                             | H            | H             | H                        |
| AWS IOT Greengrass         | Open source commercial | H                      | H            | H        | M                                             | H            | H             | H                        |
| Eclipse Ditto              | Open source            | M                      | H            | M        | H                                             | H            | L             | L                        |
| Asset Administration Shell | Open source            | H                      | H            | L        | H                                             | M            | L             | M                        |
| PTC Thingworx              | Commercial             | H                      | H            | H        | H                                             | H            | M             | M                        |
| GE Predix                  | Commercial             | M                      | H            | H        | M                                             | L            | M             | L                        |
| The DTaaS Platform         | Open source            | H                      | H            | L        | L                                             | M            | M             | M                        |

    Adapted by Tanusree Roy from Tables 4 and 5 of the following paper.

    Ref: Naseri, F., Gil, S., Barbu, C., Cetkin, E., Yarimca, G., Jensen, A. C.,
    ... & Gomes, C. (2023). Digital twin of electric vehicle battery systems:
    Comprehensive review of the use cases, requirements, and platforms.
    Renewable and Sustainable Energy Reviews, 179, 113280.

??? Question "All the comparisons between DT platforms seems so confusing. Why?"

    The confusion comes from the fact that different DT platforms
    (Azure DT, GE Predix) provide different kinds of DT capabilities. GE Predix
    can run all kinds of models natively, even next to (on) the PTs.
    The Azure DT service cannot do this natively. The user must integrate
    it with other Azure services or third-party services to get the
    capabilities that GE Predix provides natively in one interface.
    The right platform therefore depends on the specific requirements.

## GDPR Concerns

??? Question "Does the platform adhere to GDPR compliance standards? If so, how?"

    The DTaaS platform does not store any personal information
    about users. It stores only usernames to identify users, and these
    usernames do not contain enough information to deduce a user's
    true identity.

??? Question "Which security measures are deployed? How is data encrypted (if exists)?"

    The multi-user server installation requires an HTTPS-terminating reverse
    proxy between the users and the DTaaS platform installation.
    Administrators can install HTTPS certificates into the application.
    The codebase can produce an HTTPS-enabled application, and users can
    also install their own certificates obtained from
    certificate authorities such as Let's Encrypt.

??? Question "What security measures does the cloud provider offer?"

    The DTaaS platform can be installed on a corporate server hosted
    behind network firewalls,
    so that only permitted user groups have network access and
    physical access to the server.

??? Question "How is user access controlled and authenticated?"

    The multi-user server installation of DTaaS has two levels of
    authorisation. The first level is server-side OAuth 2.0 authorisation
    through Traefik forward-auth over a secure HTTPS connection. The second
    level is the OAuth 2.0 PKCE authorisation flow in the web client.
    A GitLab instance provides both. DTaaS does not store the account and
    authorisation information of users.

??? Question "Does the platform manage personal data? How is data classified and tagged based on the sensitivity? Who has access to the critical data?"

    The platform does not store personal data of users.

??? Question "How are identities and roles managed within the platform?"

    The platform has two roles: administrator and user.
    The administrator manages the user roles.
