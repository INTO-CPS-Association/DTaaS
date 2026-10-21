# Workspace Examples

These digital twins run interactively inside the DTaaS user workspace.
You can download each example and run it with its lifecycle scripts.

## Copy Examples

Copy all the example code into the user workspace with this script:

```bash
wget https://raw.githubusercontent.com/INTO-CPS-Association/DTaaS-examples/main/getExamples.sh
bash getExamples.sh
```

This copies all examples into the `/workspace/examples` directory.

The script also works when run as root. The examples are then given to
the user who ran `sudo`, or to the owner of the directory containing
the examples, so that the workspace user can run them.
Set `REPOSITORY` and `BRANCH` to download the examples from another
repository or branch, for example
`REPOSITORY=<user>/DTaaS-examples BRANCH=<branch> bash getExamples.sh`.

The lifecycle scripts locate the models, tools, data and common assets
relative to their own location. The examples work from
`/workspace/examples` and from any other directory that contains
a copy of the DTaaS-examples repository.

## Example List

The examples vary in complexity. Try them in the following order.
Some examples need external services, such as RabbitMQ, MQTT or InfluxDB,
to be running and reachable from the workspace. Configure the access
details of these services as described in the README of each example.
The demo video of each example shows it running in a terminal of the
workspace desktop of DTaaS v1.0 (`workspace-dex-localhost` installation).
The videos are sped up: results play at normal speed, installations and
long runs at 16x, and everything else at 4x.

| #   | Example                                                                                                                  | External services                     | Video                                                                                                                                        |
| --: | :----------------------------------------------------------------------------------------------------------------------- | :------------------------------------ | :------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | [Mass Spring Damper](./mass-spring-damper/README.md)                                                                     | None                                  | [demo](https://raw.githubusercontent.com/INTO-CPS-Association/DTaaS-examples/main/digital_twins/mass-spring-damper/demo.mp4)                 |
| 2   | [Water Tank Fault Injection](./water_tank_FI/README.md)                                                                  | None                                  | [demo](https://raw.githubusercontent.com/INTO-CPS-Association/DTaaS-examples/main/digital_twins/water_tank_FI/demo.mp4)                      |
| 3   | [Water Tank Model Swap](./water_tank_swap/README.md)                                                                     | None                                  | [demo](https://raw.githubusercontent.com/INTO-CPS-Association/DTaaS-examples/main/digital_twins/water_tank_swap/demo.mp4)                    |
| 4   | [Heart Digital Twin](./heart_dt/README.md)                                                                               | None                                  | [demo](https://raw.githubusercontent.com/INTO-CPS-Association/DTaaS-examples/main/digital_twins/heart_dt/demo.mp4)                           |
| 5   | [Desktop Robotti and RabbitMQ](./drobotti-rmqfmu/README.md)                                                              | RabbitMQ                              | [demo](https://raw.githubusercontent.com/INTO-CPS-Association/DTaaS-examples/main/digital_twins/drobotti_rmqfmu/demo.mp4)                    |
| 6   | [Water Treatment Plant and OPC-UA](./opc-ua-waterplant/README.md)                                                        | None (uses a mock OPC-UA server)      | [demo](https://raw.githubusercontent.com/INTO-CPS-Association/DTaaS-examples/main/digital_twins/opc-ua-waterplant/demo.mp4)                  |
| 7   | [Water Treatment Plant and OPC-UA (complete version, without lifecycle scripts)](./opc-ua-waterplant-complete/README.md) | OPC-UA server (mock servers included) | –                                                                                                                                            |
| 8   | [Three Water Tanks with TwinManager Framework](./three-tank/README.md)                                                   | None                                  | [demo](https://raw.githubusercontent.com/INTO-CPS-Association/DTaaS-examples/main/digital_twins/three-tank/demo.mp4)                         |
| 9   | [Flex Cell with Two Industrial Robots](./flex-cell/README.md)                                                            | RabbitMQ, MQTT                        | [demo](https://raw.githubusercontent.com/INTO-CPS-Association/DTaaS-examples/main/digital_twins/flex-cell/demo.mp4)                          |
| 10  | [Incubator](./incubator/README.md)                                                                                       | RabbitMQ, InfluxDB                    | [demo](https://raw.githubusercontent.com/INTO-CPS-Association/DTaaS-examples/main/digital_twins/incubator/demo.mp4)                          |
| 11  | [Firefighters in Emergency Environments](./o5g/README.md)                                                                | MQTT, InfluxDB                        | [demo](https://raw.githubusercontent.com/INTO-CPS-Association/DTaaS-examples/main/digital_twins/o5g/demo.mp4)                                |
| 12  | [Mass Spring Damper with NuRV Runtime Monitor FMU](./mass-spring-damper-monitor/README.md)                               | None                                  | [demo](https://raw.githubusercontent.com/INTO-CPS-Association/DTaaS-examples/main/digital_twins/mass-spring-damper-monitor/demo.mp4)         |
| 13  | [Water Tank Fault Injection with NuRV Runtime Monitor FMU](./water_tank_FI_monitor/README.md)                            | None                                  | [demo](https://raw.githubusercontent.com/INTO-CPS-Association/DTaaS-examples/main/digital_twins/water_tank_FI_monitor/demo.mp4)              |
| 14  | [Incubator Co-Simulation with NuRV Runtime Monitor FMU](./incubator-NuRV-monitor-validation/README.md)                   | None                                  | [demo](https://raw.githubusercontent.com/INTO-CPS-Association/DTaaS-examples/main/digital_twins/incubator-NuRV-monitor-validation/demo.mp4)  |
| 15  | [Incubator with NuRV Runtime Monitor as Service](./incubator-NuRV-monitor-service/README.md)                             | RabbitMQ, InfluxDB                    | [demo](https://raw.githubusercontent.com/INTO-CPS-Association/DTaaS-examples/main/digital_twins/incubator-NuRV-monitor-service/demo.mp4)     |
| 16  | [Incubator with NuRV Runtime Monitor FMU as Service](./incubator-NuRV-fmu-monitor-service/README.md)                     | RabbitMQ, InfluxDB                    | [demo](https://raw.githubusercontent.com/INTO-CPS-Association/DTaaS-examples/main/digital_twins/incubator-NuRV-fmu-monitor-service/demo.mp4) |
| 17  | [Incubator with TeSSLa Runtime Monitor as Service](./incubator-TeSSLa-monitor-service/README.md)                         | RabbitMQ, InfluxDB                    | [demo](https://raw.githubusercontent.com/INTO-CPS-Association/DTaaS-examples/main/digital_twins/incubator-TeSSLa-monitor-service/demo.mp4)   |
| 18  | [Incubator with TeSSLa Runtime Monitor for Active Control](./incubator-TeSSLa-active-control/README.md)                  | RabbitMQ, InfluxDB                    | [demo](https://raw.githubusercontent.com/INTO-CPS-Association/DTaaS-examples/main/digital_twins/incubator-TeSSLa-active-control/demo.mp4)    |
| 19  | [BIM - Building Information Modeling](./fzk_haus/README.md)                                                              | MQTT                                  | [demo](https://raw.githubusercontent.com/INTO-CPS-Association/DTaaS-examples/main/digital_twins/fzk_haus/demo.mp4)                           |

[DTaaS examples](https://github.com/INTO-CPS-Association/DTaaS-examples)
