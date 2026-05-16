# Structural Health Monitoring

## Overview

This example demonstrates the use of digital twin methodology for structural
health monitoring (SHM). A digital twin workflow shown below has been developed
for the SHM use cases.

![DT workflow](dt-workflow.png)

The complete source code for this example is [available
online](https://github.com/INTO-CPS-Association/example-shm).

## Example Structure

This digital twin consists of

- **SHM package**: package implementing the digital twin workflow. This package
  also contains the recorded data from physical twin and replay functions that
  stream data into the digital twin workflow.
- **replay.json**: MQTT configuration file for replaying the recorded data

The package can demonstrate these experimental scenarios.

- **replay** replays the recorded readings from cantilever beam setup.
- **acceleration_readings** demonstrates the use of `Accelerometer` class to
  extract
  accelerometer measurements from MQTT data stream.
- **aligning_readings** demonstrates the use of `Aligner` class to collect and
  align accelerometer measurements from multiple MQTT data streams.

- **sysid** demonstrates the use of `sysid` with four cases:
    1. **sysid-and-plot**: plots natural frequencies.
    2. **sysid-and-print**: prints sysid output to console.
    3. **sysid-and-publish**: publishes one set of sysid output via MQTT
       to the config given under [sysid] config.
    4. **live-sysid-and-publish**: Continuously publishes sysid output via
       MQTT to the config given under [sysid] config.

- **Clustering** demonstrates the use of `clustering` with three cases:
    1. **clustering-with-local-sysid**: gets the sysid output by runing sysid
       locally, then runs the mode clustering.
    2. **clustering-with-remote-sysid**: gets sysid output by subscribing,
       then runs the mode clustering. This is a one time operation.
    3. **live-clustering-with-remote-sysid**: gets sysid output by subscribing,
       then runs the mode clustering. This operation runs in loop.
    4. **live-clustering-with-remote-sysid-and-publish**: gets sysid output
       by subscribing, then runs the mode clustering. The cluster results
       are published. This operation runs in loop.

- **mode-tracking** demonstrates the use of `mode_tracking` with three cases:
    1. **mode-tracking-with-local-sysid**: gets the sysid output by runing sysid
       locally, then runs mode clustering and mode tracking.
    2. **mode-tracking-with-remote-sysid**: gets sysid output by subscribing,
       then runs mode clustering and mode tracking. This is a one time operation.
    3. **live-mode-tracking-with-remote-sysid**: gets sysid output by subscribing,
       then runs mode clustering and mode tracking. This operation runs in loop.

- **model-update** demonstrates the use of `model_update` with two cases:
    1. **model-update-local-sysid**: gets the sysid output, then uses it to
      run update model and get updated system parameters.
    2. **live-model-update-with-remote-sysid**: gets the sysid output by
       subscribing to MQTT topic, then runs mode clustering to run update
       model and get updated system parameters.
    3. **live-model-update-with-remote-clustering**: gets the mode clustering
       output by subscribing to MQTT topic, then uses the mode clustering
       output to run update model and get updated system parameters.

Of the above mentioned experimental scenarios, the following can be placed in
the automated execution mode.

- **acceleration_readings** demonstrates the use of `Accelerometer` class to
  extract
  accelerometer measurements from MQTT data stream.

- **aligning_readings** demonstrates the use of `Aligner` class to collect and
  align accelerometer measurements from multiple MQTT data streams.

- **sysid** demonstrates the use of `sysid` with four cases. It prints sysid
  output to console.

- **Clustering** demonstrates the use of `sysid` and `clustering`.

- **mode-tracking** demonstrates the use of `sysid` and `mode_tracking`.

- **model-update** demonstrates the use of the digital twin workflow upto
  `model_update`.

## Configuration

This example uses MQTT broker for replaying the recorded data from physical
twin. The format of the configuration file is in `replay.json`. MQTT credentials
need to be updated in the file. In case a local MQTT broker is not available,
[test server](https://test.mosquitto.org/) can also be used.

## Use

The available experimental scenarios can be found by running the program

```bash
$example-shm
Usage: example-shm [OPTIONS] COMMAND [ARGS]...

Options:
  --config TEXT  Path to config file
  --help         Show this message and exit.

Commands:
  accelerometers
  align-readings
  clustering-with-local-sysid
  clustering-with-remote-sysid
  live-clustering-with-remote-sysid
  live-clustering-with-remote-sysid-and-publish
  live-mode-tracking-with-remote-sysid
  live-model-update-with-remote-clustering
  live-model-update-with-remote-sysid
  live-sysid-publish
  mode-tracking-with-local-sysid
  mode-tracking-with-remote-sysid
  model-update-with-local-sysid
  replay
  sysid-and-plot
  sysid-and-print
  sysid-and-publish
```

Run these examples with the `replay.json` config:

```bash
$example-shm --config replay.json <experiment-name>
Usage: example-shm --config replay.json accelerometers
```

### Automated Execution

The current configuration of this example demonstrates system identification and
model update. A truncated sample output can be seen here. The execution
timestamps have been removed from this log to show the main content.

```log
Using docker image sha256:16f554efe9f9e182e2ec6b86ad37360138407a456a69982ed1b8261716ce5163 for python:3.12 with digest
$ cd digital_twins/shm
$ bash lifecycle/sysid_print
...

pyoma2.setup.base - INFO - Running SSIcovmm_mt... (base:123)
pyoma2.functions.ssi - INFO - Assembling Hankel matrix method: cov_mm... (ssi:82)
pyoma2.functions.ssi - INFO - ... uncertainty calculations... (ssi:94)
pyoma2.functions.ssi - INFO - SSI for increasing model order... (ssi:359)
JSON configuration loaded successfully.
on_connect: Connected with response code Success
Subscribing to topic: cpsens/recorded/1/metadata
on_subscribe: Subscription ID 1 with QoS levels [ReasonCode(Suback, 'Granted QoS 0')]
Extracted Fs from metadata: 256.0
on_connect: Connected with response code Success
Subscribing to topic: cpsens/recorded/1/data
on_subscribe: Subscription ID 1 with QoS levels [ReasonCode(Suback, 'Granted QoS 1')]
on_subscribe: Subscription ID 2 with QoS levels [ReasonCode(Suback, 'Granted QoS 1')]
on_subscribe: Subscription ID 3 with QoS levels [ReasonCode(Suback, 'Granted QoS 1')]
on_subscribe: Subscription ID 4 with QoS levels [ReasonCode(Suback, 'Granted QoS 1')]
on_subscribe: Subscription ID 5 with QoS levels [ReasonCode(Suback, 'Granted QoS 1')]
on_subscribe: Subscription ID 6 with QoS levels [ReasonCode(Suback, 'Granted QoS 1')]
on_subscribe: Subscription ID 7 with QoS levels [ReasonCode(Suback, 'Granted QoS 1')]
on_subscribe: Subscription ID 8 with QoS levels [ReasonCode(Suback, 'Granted QoS 1')]
Waiting for data for 0.1 seconds
Waiting for data for 0.2 seconds
Waiting for data for 0.3 seconds
...

sysid parameters: {'freq_variance_treshold': 0.1, 'damp_variance_treshold': 1000000, 'Fs': 256, 'model_order_min': 2, 'model_order': 15, 'block_shift': 30, 'mstab': 6, 'tMAC': 0.95, 'bound_multiplier': 2, 'allignment_factor': [0.05, 0.01], 'phi_cri': 0.8, 'freq_cri': 0.2, 'obj_cri': 0.1, 'tMAC_MU': 0.7, 'modes_search_paring': 6, 'pars_to_update': ['k_rot', 'm'], 'MU_start_values': array([10.   ,  0.015]), 'MU_bounds': [(0.01, 1000), (0, 1000)], 'MU_modes': [1, 2, 3]}

  0%|          | 0/16 [00:00<?, ?it/s]
100%|██████████| 16/16 [00:00<00:00, 23563.51it/s]
Cluster 0.4465797245502472 too short: 1 Must be: > 6
Cluster saved: 27.93849468231201
Updated parameters are:
k_rot: 12.04591179878987
m: 0.0
Model frequencies: [  4.13819299  26.68572155  80.22633861 164.67016633 180.37962416
  326.70816499] [Hz]
[DONE].
```

## References

1. This example corresponds to
   [commit ce47244](https://github.com/INTO-CPS-Association/example-shm/tree/ce4724457b9c11f2513026d4009ca41b2bba489a)
   of the
   [example-shm repository](https://github.com/INTO-CPS-Association/example-shm).
2. Talasila, P., Tcherniak, D., Jensen, A. M. D., Mahato, S.,
   Schörghofer-Queiroz, A., Ulriksen, M. D., ... & Damkilde, L. (2025,
   July). Structural Health Monitoring of Engineering Structures Using
   Digital Twins: A Digital Twin Platform Approach. In International
   Conference on Experimental Vibration Analysis for Civil Engineering
   Structures (pp. 986-996). Cham: Springer Nature Switzerland.)
