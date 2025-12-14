# Incubator Digital Twin with NuRV monitoring service

## Overview

This example demonstrates how a runtime monitoring service (in this example NuRV[1])
can be connected with the [Incubator digital twin](../incubator/README.md) to
verify runtime behavior of the Incubator.

## Simulated scenario

This example simulates a scenario where the lid of the Incubator is removed and
later put back on. The Incubator is equipped with anomaly detection capabilities,
which can detect anomalous behavior (i.e. the removal of the lid). When an anomaly
is detected, the Incubator triggers an energy saving mode where the heater is
turned off.

From a monitoring perspective, we wish to verify that within 3 simulation steps
of an anomaly detection, the energy saving mode is turned on. To verify this
behavior, we construct the property:
$`anomaly \rightarrow (F_{[0,3]}\space energy\_saving)`$.
Whenever a True or False verdict is produced by the monitor, it is reset,
allowing for the detection of repeated satisfaction/violation detections of
the property.

The simulated scenario progresses as follows:

- *Initialization*: The services are initialized and the Kalman filter in
  the Incubator is given 2 minutes to stabilize. Sometimes, the anomaly detection
  algorithm will detect an anomaly at startup even though the lid is still on.
  It will disappear after approx 15 seconds.
- *After 2 minutes*: The lid is lifted and an anomaly is detected.
  The energy saver is turned on shortly after
- *After another 30 seconds*: The energy saver is manually disabled producing
  a False verdict.
- *After another 30 seconds*: The lid is put back on and the anomaly detection
  is given time to detect that the lid is back on. The simulation then ends.

## Example structure

A diagram depicting the logical software structure of the example can be seen below.

![DT structure](./figures/dt-structure-nurv.svg)

The *execute.py* script is responsible for orchestrating and starting all
the relevant services in this example. This includes the Incubator DT,
CORBA naming service (omniNames) and the NuRV monitor server as well as
implementing the *Monitor connector* component that connects the DT output
to the NuRV monitor server.

The NuRV monitor server utilizes a CORBA naming service where it registers
under a specific name. A user can then query the naming service for
the specific name, to obtain a reference to the monitor server.
For more information on how the NuRV monitor server works,
please refer to [1].

After establishing connection with the NuRV monitor server, the Incubator DT
is started and a RabbitMQ client is created that subscribes to changes in
the *anomaly* and *energy_saving* states of the DT. Each time an update is
received of either state, the full state (the new updated state and
the previous other state) is pushed to the NuRV monitor server whereafter
the verdict is printed to the console.

## Digital Twin Configuration

Before running the example, the *simulation.conf* file should be configured with
the appropriate RabbitMQ credentials.

The example uses the following assets:

| Asset Type    | Names of Assets                | Visibility | Reuse in other Examples |
| :------------ | :----------------------------- | :--------- | :---------------------- |
| Service       | common/services/NuRV_orbit     | Common     | Yes                     |
| DT            | common/digital_twins/incubator | Common     | Yes                     |
| Specification | safe-operation.smv             | Private    | No                      |
| Script        | execute.py                     | Private    | No                      |

The *safe-operation.smv* file contains the default monitored specification as
described in the [Simulated scenario section](#simulated-scenario).
These can be configured as desired.

## Lifecycle phases

The lifecycle phases for this example include:

| Lifecycle phase | Completed tasks                                                                                                                                                                                                |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| create          | Downloads the necessary tools and creates a virtual python environment with the necessary dependencies                                                                                                         |
| execute         | Runs a python script that starts up the necessary services as well as the Incubator simulation. Various status messages are printed to the console, including the monitored system states and monitor verdict. |
| clean           | Removes created *data* directory and incubator log files.                                                                                                                                                      |

If required, change the execute permissions of lifecycle scripts you need to execute.
This can be done using the following command

```bash
chmod +x lifecycle/{script}
```

where {script} is the name of the script, e.g. *create*, *execute* etc.

## Running the example

To run the example, first run the following command in a terminal:

```bash
cd /workspace/examples/digital_twins/incubator-monitor-server/
```

Then, first execute the *create* script (this can take a few mins
depending on your network connection) followed by the *execute*
script using the following command:

```bash
lifecycle/{script}
```

The *execute* script will then start outputting system states and
the monitor verdict approx every 3 seconds. The output is printed
as follows
"__State: {anomaly state} & {energy_saving state}, verdict: {Verdict}__"
where "*anomaly*" indicates that an anomaly is detected and "!anomaly"
indicates that an anomaly is not currently detected. The same format
is used for the energy_saving state.

The monitor verdict can be True, False or Unknown, where the latter
indicates that the monitor does not yet have sufficient information
to determine the satisfaction of the property.

An example output trace is provided below:

````log
....
Running scenario with initial state: lid closed and energy saver on
Setting energy saver mode: enable
Setting G_box to: 0.5763498
State: !anomaly & !energy_saving, verdict: True
State: !anomaly & !energy_saving, verdict: True
....
State: anomaly & !energy_saving, verdict: Unknown
State: anomaly & energy_saving, verdict: True
State: anomaly & energy_saving, verdict: True
````

There is currently some startup issues with connecting to the NuRV server,
and it will likely take a few tries before the connection is established.
This is however handled automatically.

## References

1. Information on the NuRV monitor can be found on
   [FBK website](https://es-static.fbk.eu/tools/nurv/).
