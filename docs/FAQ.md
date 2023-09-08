
## Abreviations

| Term | Full Form |
|:---|:---|
| DT | Digital Twin |
| DTaaS | Digital Twin as a Service |
| PT | Physical Twin |

## General Questions

??? Question "What is DTaaS?"

    DTaaS is software platform on which you can create and run digital twins.
    Please see the [features](user/features.md) page to get a sense of the things you can do in DaaS.


??? Question "Are there any Key Performance / Capability Indicators for DTaaS?"

    | Key Performance Indicator | Value |
    |:---|:---|
    | Processor | Two AMD EPYC 7443 24-Core Processors |
    | Maximum Storage Capacity | 4TB SSD, RAID 0 configuration |
    | Storage Type | File System |
    | Maximum file size | 10 GB |
    | Data transfer speed | 100 Mbps |
    | Data Security | Yes |
    | Data Privacy | Yes |
    | Redundancy | None |
    | Availability | It is a matter of human resources. If you have human resources to maintain DTaaS round the clock, upwards 95% is easily possible. |


??? Question "Do you provide licensed software like Matlab?"

    The licensed software are not available on the software platform.
    But users have private workspaces which are based on Linux-based xfce Desktop environment.
    Users can install software in their workspaces. The licensed software
    installed by one user is not available to another user.


## Digital Twin Models

??? Question "Can DTaaS create new DT models?"

    DTaaS is not a model creation  tool. You can put model creation tool inside DTaaS and create new models.

    The DTaaS itself does not create digital twin models. But you can run Linux desktop / terminal tools  inside the DTaaS. So you can create models inside DTaaS and run them using tools that can run in Linux. The Windows only tools can not run in DTaaS.


??? Question "How can DTaaS help to design geometric model? Does it support 3D modeling and simulation?"

    Well, DTaaS by itself does not produce any models. DTaaS only provides a platform and an ecosystem of services to facilitate digital twins to be run as services. Since each user has a Linux OS at their disposal, they can also run digital twins that have graphical interface.

    In summary, DTaaS is neither a modeling nor simulation tool. If you need these kinds of tools, you need to bring them onto the platform. For example, if you need Matlab for your work, you need to bring the licensed Matlab software. 


??? Question "DTaas is not able to do any modelling or simulation in this case, like other platforms in market provide modelling and simulation alongside integration and UI. Is this a correct understanding?"

    Yes, you are right


??? Question "Does it support XML-based representation and ontology representation?"

    Currently No. **We are looking for users needing this capability. If you have concrete requirements and an example, we can discuss a way of realizing it in DTaaS**. 


## Communication Between Physical Twin and Digital Twin

??? Question "How would you measure a physical entity like shape, size, weight, structure, chemical attributes etc. using DTaaS? Any specific technology used in this case?"

    The real measurements are done at physical twin which are then communicated to the digital twin. Any digital twin platform like DTaaS can only facilitate this communication of these measurements from physical twin. The DTaaS provides InfluxDB, RabbitMQ and Mosquitto services for this purpose. These three are probably most widely used services for digital twin communication. 

    Having said that, DTaaS allows you to utilize other communication technologies and services hosted elsewhere on the Internet.

??? Question "How a real-time data can be differed from static data and what is the procedure to identify dynamic data? Is there any UI or specific tool used here?"

    DTaaS can not understand the static or dynamic nature of data. It can facilitate storing names, units and any other text description of interesting quantities (weight of batter, voltage output etc). It can also store the data being sent by the physical twin. The distinction between static and dynamic data needs to be made by the user.

    Only metadata of the data can reveal such more information about the nature of data. A tool can probably help in very specific cases, but you need metadata. If there is a human being making this distinction, then the need for metadata goes down but does not completely go away.

    In some of the DT platforms supported by manufacturers, there is a tight integration between data and model. In this case, the tool itself is taking care of the metadata. The DTaaS is a generic platform which can support execution of digital twins. If a tool can be executed on a Linux desktop / commandline, the tool can be supported within DTaaS. The tool (ex. Matlab) itself can take care of the metadata requirements.


??? Question "How can DTaaS control the physical entity? Which technologies it uses for controlling the physical world?"

    At a very abstract level, there is a communication from physical entity to digital entity and back to physical entity. How this communication should happen is decided by the person designing the digital entity. The DTaaS can provide communication services that can help you do this communication with relative ease. 

    You can use InfluxDB, RabbitMQ and Mosquitto services hosted on DTaaS for two communication between digital and physical entities.



## Data Management

??? Question "Does DTaaS support data collection from different sources like hardware, software and network? Is there any user interface or any tracking instruments used for data collection?"

    The DTaaS provids InfluxDB, RabbitMQ, MQTT  services. Both the physical twin and digital twin can utilize these protocols for communication. The IoT (time-series) data can be collected using InfluxDB and MQTT broker services. There is a user interface for InfluxDB which can be used to analyze the data collected.

    Users can also manually upload their data files into DTaaS.


??? Question "Which transmission protocol does DTaaS allow?"

    InfluxDB, RabbitMQ, MQTT and anything else that can be used from Cloud service providers.


??? Question "Does DTaaS support multisource information and combined multi sensor input data? Can it provide analysis and decision-supporting inferences?"

    You can store information from multiple sources. The existing InfluxDB services hosted on DTaaS already has a dedicated Influx / Flux query language for doing sensor fusion, analysis and inferences.


??? Question "Which kinds of visualization technologies DTaaS can support (e.g. graphical, geometry, image, VR/AR representation)?"

    Graphical, geometric and images. If you need specific licensed software for the visualization, you will have to bring the license for it. DTaaS does not support AR/VR.

??? Question "Can DTaaS collect data directly from sensors?"

    Yes

??? Question "Is DTaaS able to transmit data to cloud in real time?"

    Yes

    
## Platform Native Services on DTaaS Platform

??? Question "Is DTaaS able to detect the anomalies about-to-fail components and prescribe solutions?"

    This is the job of a digital twin. If you have a ready to use digital twin that does the job, DTaaS allows others to use your solution.