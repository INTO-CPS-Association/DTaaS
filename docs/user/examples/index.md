# DTaaS Examples

There are some example digital twins created for the DTaaS software.
You can peruse these examples and follow the steps given in
this **Examples** section
to experience features of the DTaaS software platform and understand
best practices for managing digital twins within the platform.
Please see these
[slides](https://odin.cps.digit.au.dk/into-cps/dtaas/assets/20240917-Examples.pdf)
and
[video](https://odin.cps.digit.au.dk/into-cps/dtaas/assets/videos/20240917-Examples-Recorded-web.mp4)
to get an overview of these examples.

There are two demo vides available:
CP-SENS project
([slides](https://odin.cps.digit.au.dk/into-cps/dtaas/assets/20240917-CPSENS-demo.pdf)
and
[video](https://odin.cps.digit.au.dk/into-cps/dtaas/assets/videos/20240917-CPSENS-demo-Recorded-web.mp4))
and Incubator
([video](https://odin.cps.digit.au.dk/into-cps/dtaas/assets/videos/Incubator-demo-web.mp4)).
These two videos have been recorded using DTaaS v0.5.0.

## Copy Examples

The first step is to copy all the example code into your
user workspace within the DTaaS.
Use the given shell script to copy all the examples
into `/workspace/examples` directory.

```bash
wget https://raw.githubusercontent.com/INTO-CPS-Association/DTaaS-examples/main/getExamples.sh
bash getExamples.sh
```

## Example List

The digital twins provided in examples vary in their complexity. It is best
to use the examples in the following order.

1. [Mass Spring Damper](./mass-spring-damper/README.md)
1. [Water Tank Fault Injection](./water_tank_FI/README.md)
1. [Water Tank Model Swap](./water_tank_swap/README.md)
1. [Desktop Robotti and RabbitMQ](./drobotti-rmqfmu/README.md)
1. [Water Treatment Plant and OPC-UA](./opc-ua-waterplant/README.md)
1. [Three Water Tanks with DT Manager Framework](./three-tank/README.md)
1. [Flex Cell with Two Industrial Robots](./flex-cell/README.md)
1. [Incubator](./incubator/README.md)
1. [Firefighters in Emergency Environments](./o5g/README.md)
1. [Mass Spring Damper with NuRV Runtime Monitor FMU](./mass-spring-damper-monitor/README.md)
1. [Water Tank Fault Injection with NuRV Runtime Monitor FMU](./water_tank_FI_monitor/README.md)
1. [Incubator Co-Simulation with NuRV Runtime Monitor FMU](./incubator-NuRV-monitor-validation/README.md)
1. [Incubator with NuRV Runtime Monitor as Service](./incubator-NuRV-monitor-service/README.md)
1. [Incubator with NuRV Runtime Monitor FMU as Service](./incubator-NuRV-fmu-monitor-service/README.md)

:material-download: [DTaaS examples](https://github.com/INTO-CPS-Association/DTaaS-examples)
