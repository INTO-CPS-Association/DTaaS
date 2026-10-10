# Incubator Digital Twin with NuRV FMU Monitoring Service

## Overview

This example shows how an FMU can serve as a runtime monitoring
service (here generated with NuRV[1]) and be connected to the
[Incubator digital twin](../incubator/README.md) to verify the
runtime behaviour of the Incubator.

## Simulated scenario

This example simulates a scenario where the lid of the Incubator is
removed and later put back on. The Incubator has anomaly detection,
which can detect anomalous behaviour such as the removal of the lid.
When it detects an anomaly, the Incubator switches to an energy saving
mode in which the heater is turned off.

The monitor checks that the energy saving mode is turned on within
3 messages of an anomaly detection. The property for this is:

$G(anomaly \rightarrow (F_{[0,3]}\space energy\_saving))$.

The monitor outputs the _unknown_ state as long as the property is
satisfied and moves to the _false_ state once it detects a violation.

The simulated scenario progresses as follows:

- _Initialization_: The services are initialized and the Kalman filter
  in the Incubator is given 2 minutes to stabilize. The anomaly
  detection algorithm sometimes detects an anomaly at startup even
  though the lid is still on. This disappears after about 15 seconds.
- _After 2 minutes_: The lid is lifted and an anomaly is detected.
  The energy saver is turned on shortly after.
- _After another 30 seconds_: The energy saver is manually disabled,
  producing a _false_ verdict.
- _After another 30 seconds_: The lid is put back on and
  the anomaly detection is given time to detect that the lid is back on.
  The monitor is then reset, producing an _unknown_ verdict again.
  The simulation then ends.

## Example structure

The diagram below shows the logical software structure of the example.

![DT structure](./figures/dt-structure-nurv-fmu.png)

The _execute_ script starts the NuRV service and then runs the Python
script that controls the scenario (_execute.py_).

The _execute.py_ script starts the Incubator services and runs
the example scenario. Once the Incubator DT is started, a RabbitMQ client
is created that subscribes to changes in the _anomaly_ and
_energy_saving_ states of the DT, as well as the verdicts produced
by the NuRV service.
Each time an update arrives, the full state or the verdict is
printed to the console.

## Digital Twin Configuration

Before running the example, configure the _simulation.conf_ file with
the appropriate RabbitMQ credentials.

The example uses the following assets:

| Asset Type    | Names of Assets                | Visibility | Reuse in other Examples |
| :------------ | :----------------------------- | :--------- | :---------------------- |
| Tools         | common/tools/NuRV/NuRV         | Common     | Yes                     |
| Other         | common/fmi2_headers            | Common     | Yes                     |
| DT            | common/digital_twins/incubator | Common     | Yes                     |
| Specification | safe-operation.smv             | Private    | No                      |
| Script        | execute.py                     | Private    | No                      |

The _safe-operation.smv_ file contains the default monitored specification
described in the [Simulated scenario section](#simulated-scenario).
It can be changed as needed.

## Lifecycle phases

The lifecycle phases for this example are:

| Lifecycle phase | Completed tasks                                                                                                                                                                                                |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| create          | Creates a virtual python environment with the necessary dependencies and generates the monitor FMU from the NuRV specification                                                                                 |
| execute         | Runs a python script that starts up the necessary services as well as the Incubator simulation. Various status messages are printed to the console, including the monitored system states and monitor verdict. |

If required, make the lifecycle scripts executable with the following
command.

```bash
chmod +x lifecycle/{script}
```

where {script} is the name of the script, for example _create_ or
_execute_.

## Running the example

To run the example, first run the following command in a terminal:

```bash
cd /workspace/examples/digital_twins/incubator-NuRV-fmu-monitor-service/
```

Then run the _create_ script followed by the _execute_ script
using the following command:

```bash
lifecycle/{script}
```

The _execute_ script then prints the system states and the monitor
verdict about every 3 seconds. System states are printed in this format:

"__State: {anomaly state} & {energy_saving state}__"

where "_anomaly_" means that an anomaly is detected and "!anomaly"
means that no anomaly is currently detected. The energy_saving state
uses the same format.
NuRV verdicts are printed in this format:

"__Verdict from NuRV: {verdict}__".

The monitor verdict can be false or unknown. Unknown means that the
monitor does not yet have enough information to decide whether the
property is satisfied. Because of the G operator, the monitor never
produces a true verdict: satisfaction can only be confirmed over the
entire trace. The unknown state can therefore be read as a tentative
true verdict.

An example output trace is provided below:

````log
....
Using LIFECYCLE_PATH: /workspace/examples/digital_twins/incubator-NuRV-fmu-monitor-service/lifecycle
Using INCUBATOR_PATH: /workspace/examples/digital_twins/incubator-NuRV-fmu-monitor-service/lifecycle/../../../common/digital_twins/incubator
Starting NuRV FMU Monitor Service, see output at /tmp/nurv-fmu-service.log
NuRVService.py PID: 13496
Starting incubator
Connected to rabbitmq server.
Running scenario with initial state: lid closed and energy saver on
Setting energy saver mode: enable
Setting G_box to: 0.5763498
State: !anomaly & !energy_saving
State: !anomaly & !energy_saving
Verdict from NuRV: unknown
State: !anomaly & !energy_saving
State: !anomaly & !energy_saving
Verdict from NuRV: unknown
State: !anomaly & !energy_saving
State: !anomaly & !energy_saving
Verdict from NuRV: unknown
State: !anomaly & !energy_saving
State: !anomaly & !energy_saving
Verdict from NuRV: unknown
State: !anomaly & !energy_saving
State: !anomaly & !energy_saving
Verdict from NuRV: unknown
````

## References

1. Information on the NuRV monitor can be found on
   [FBK website](https://es-static.fbk.eu/tools/nurv/).
