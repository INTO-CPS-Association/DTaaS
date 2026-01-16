# DTaaS Examples

Several example digital twins have been created for the DTaaS platform.
These examples can be explored, and the steps provided in
this **Examples** section can be followed
to experience features of the DTaaS platform and understand
best practices for managing digital twins within the platform.
The following
[slides](https://odin.cps.digit.au.dk/into-cps/dtaas/assets/20240917-Examples.pdf)
and
[video](https://odin.cps.digit.au.dk/into-cps/dtaas/assets/videos/20240917-Examples-Recorded-web.mp4)
provide an overview of these examples.

Please see the following demos illustrating the use the DTaaS in two projects:

<table>
  <thead>
    <tr>
      <th>Project</th>
      <th>Slides and Videos</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td rowspan="4">CP-SENS project</td>
      <td>Project Introduction:
        <a href="https://odin.cps.digit.au.dk/into-cps/dtaas/assets/20240917-CPSENS-demo.pdf">
          slides</a> and
        <a href="https://odin.cps.digit.au.dk/into-cps/dtaas/assets/videos/20240917-CPSENS-demo-Recorded-web.mp4">
          video</a></td>
    </tr>
    <tr>
      <td><a href="https://odin.cps.digit.au.dk/into-cps/dtaas/assets/videos/20251125_DTU-wind-turbine-blade-testing.mp4">
        Wind turbine testing</a> with the demo inside user workspace</td>
    </tr>
    <tr>
      <td><a href="https://github.com/INTO-CPS-Association/example-shm/releases">
        Python package</a>
        and
        <a href="https://odin.cps.digit.au.dk/into-cps/cp-sens/20251128_Python_package_0.6.0.mp4">
          demo video</a></td>
    </tr>
    <tr>
      <td>Videos demonstrating digital twin for structural health monitoring
        applications:
        <a href=
        "https://odin.cps.digit.au.dk/into-cps/dtaas/assets/videos/20250525_DAQ-1.mp4">
          Data Acquisition System: Part-1</a>,
        <a href="https://odin.cps.digit.au.dk/into-cps/dtaas/assets/videos/20250525_DAQ-2.mp4">
          Data Acquisition System: Part-2</a>,
        <a href="https://odin.cps.digit.au.dk/into-cps/dtaas/assets/videos/20250525_OMA.mp4">
          Operational Model Analysis</a>,
        and
        <a href="https://odin.cps.digit.au.dk/into-cps/dtaas/assets/videos/20250525_Model-Update.mp4">
          Model Updating</a></td>
    </tr>
    <tr>
      <td>Incubator</td>
      <td><a href="https://odin.cps.digit.au.dk/into-cps/dtaas/assets/videos/Incubator-demo-web.mp4">
        video</a></td>
    </tr>
  </tbody>
</table>

## Copy Examples

The first step is to copy all example code into the
user workspace within a user workspace.
The provided shell script copies all examples
into the `/workspace/examples` directory.

```bash
wget https://raw.githubusercontent.com/INTO-CPS-Association/DTaaS-examples/main/getExamples.sh
bash getExamples.sh
```

## Example List

The digital twins provided in examples vary in complexity. It is recommended
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
1. [Mass Spring Damper with NuRV Runtime Monitor FMU](
   ./mass-spring-damper-monitor/README.md)
1. [Water Tank Fault Injection with NuRV Runtime Monitor FMU](
   ./water_tank_FI_monitor/README.md)
1. [Incubator Co-Simulation with NuRV Runtime Monitor FMU](
   ./incubator-NuRV-monitor-validation/README.md)
1. [Incubator with NuRV Runtime Monitor as Service](
   ./incubator-NuRV-monitor-service/README.md)
1. [Incubator with NuRV Runtime Monitor FMU as Service](
   ./incubator-NuRV-fmu-monitor-service/README.md)

:material-download: [DTaaS examples](https://github.com/INTO-CPS-Association/DTaaS-examples)
