
# Incubator Digital Twin with TeSSLa Monitoring Service

## Overview

This example demonstrates how a runtime monitoring service (in this example
TeSSLa[1]) can be connected to the [Incubator Digital
Twin](https://github.com/INTO-CPS-Association/DTaaS-examples/blob/main/common/digital_twins/incubator/README.md)
to verify the runtime behaviour of the incubator.

## Simulated scenario

This example simulates a scenario where the lid of the incubator is removed and
later replaced. The incubator is equipped with anomaly detection capabilities
that can detect anomalous behaviour (i.e. removal of the lid). If an anomaly is
detected, the incubator will enter an energy saving mode where the heating is
switched off.

From a monitoring perspective, we want to verify that within approximately 3
simulation steps of an anomaly being detected, the energy saving mode is turned
on. To verify this behaviour we construct the property:
$G(anomaly \rightarrow (F_{[0,3]}\space energy\_saving))$.
The monitor will output the _normal_ state as long as the property is satisfied,
and will switch to the _alert_ state as soon as a violation is detected.

The simulated scenario is as follows

- _Initialisation_: The services are initialised and the Kalman filter in the
  incubator is given 2 minutes to stabilise.
- After 2 minutes*: The lid is lifted and an anomaly is detected. The power
  saver is activated shortly after.
- After a further 30 seconds: The power saver is manually deactivated, resulting
  in a False verdict.
- After another 30 seconds: The lid is replaced and anomaly detection is given
  time to detect that the lid is back on. The monitor is then reset, producing a
  _normal_ verdict again. The simulation ends.

## Example structure

A diagram showing the logical software structure of the example is shown below.

![DT structure](TeSSLa-integration.png#only-light)
![DT structure](TeSSLa-integration-dark.png#only-dark)

The _execute.py_ script is responsible for orchestrating and starting all
relevant services in this example. This includes the incubator DT, the TeSSLa
monitor and the telegraf and TeSSLa telegraf connector for communication between
the DT and the TeSSLa monitor.

The telegraf client subscribes to the RabbitMQ server used by the DT for
communication and forwards the messages on the topics
_incubator.diagnosis.plant.lidopen_ and _incubator.energysaver.status_ to the
TeSSLa telegraf connector, which feeds them as inputs to the TeSSLa monitor.
TeSSLa then makes a judgement based on this new state together with the
previously received states. The judgement is then sent back to Telegraf via the
connector and published to the _incubator.energysaver.alert_ topic and printed
on the console.

## Digital Twin configuration

Before running the example, please configure the _simulation.conf_ file with
your RabbitMQ credentials.

The example uses the following assets

| Asset type | Asset names | Visibility | Reuse in other examples |
|:---|:---|:---|:---|
| DT | common/digital_twins/incubator | Common | Yes |
| Specification | safe-operation.tessla | Private | No |
| Configuration | telegraf.conf | Private | No |
| Script | execute.py | Private | No |

The _safe-operation.tessla_ file contains the default monitoring specifications
as described in the [Simulated Scenario section](#simulated-scenario). These can
be configured as required.

## Lifecycle phases

The lifecycle phases for this example include:

| Lifecycle phase | Completed tasks |
| ------ | ------- |
| create    | Downloads the necessary tools and creates a virtual python environment with the necessary dependencies |
| execute   | Runs a python script that starts up the necessary services as well as the Incubator simulation. Various status messages are printed to the console, including the monitored system states and monitor verdict. |
| clean     | Removes created _data_ directory and incubator log files. |

If required, change the execute permissions of lifecycle scripts you need to
execute. This can be done using the following command

```bash
chmod +x lifecycle/{script}
```

where {script} is the name of the script, e.g. _create_, _execute_ etc.

## Running the example

To run the example, first run the following command in a terminal:

```bash
cd /workspace/examples/digital_twins/incubator-tessla-monitor-service/
```

Then, first execute the _create_ script (this can take a few mins depending on
your network connection) followed by the _execute_ script using the following
command:

```bash
lifecycle/{script}
```

The _execute_ script will then start outputting system states and the monitor
verdict approx every 3 seconds. The output is printed as follows
"__State: {anomaly state} & {energy_saving state}, verdict: {Verdict}__"
where "_anomaly_" indicates that an anomaly is detected and "!anomaly" indicates
that an anomaly is not currently detected. The same format is used for the
energy_saving state.

The monitor verdict can be _normal_ or _alert_, where the latte indicates that
the monitor does not yet have sufficient informationto determine the
satisfaction of the property. The monitor will never produce a True verdict as
the entire trace must be verified to ensure satisfaction due to the G operator.
Thus the _normal_ state can be viewed as a tentative True verdict.

An example output trace is provided below:

````log
....
State: anomaly & energy_saving, verdict: normal
State: anomaly & energy_saving, verdict: normal
State: anomaly & !energy_saving, verdict: normal
State: anomaly & !energy_saving, verdict: normal
State: anomaly & !energy_saving, verdict: normal
State: anomaly & !energy_saving, verdict: normal
State: anomaly & !energy_saving, verdict: alert
State: anomaly & !energy_saving, verdict: alert
````

## References

1. [tessla.io](https://tessla.io)
