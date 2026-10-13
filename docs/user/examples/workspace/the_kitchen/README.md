# BIM - Building Information Modeling

## Overview

This example puts a building model in the DTaaS library and gives each of its
rooms a simulated temperature sensor. The building is The Kitchen at Aarhus
University. Its model has 72 rooms (`IfcSpace`) and no sensors, so the example
proposes one temperature sensor per room and binds it to the room by its IFC
`GlobalId`.

The **Buildings** page of the DTaaS client draws the model from the library.
The binding manifest written by this example tells the page which reading
belongs to which room. A publisher sends a simulated temperature for every
room over MQTT, on the topics the manifest lists.

The model is used in this example with permission.

## Example Structure

| File | What it does |
|:---|:---|
| `models/the_kitchen.ifc` | The building model, IFC 2X3 |
| `lifecycle/make_manifest.py` | Proposes one sensor per room and writes the binding manifest |
| `lifecycle/publish_readings.py` | Publishes a simulated temperature per room over MQTT |
| `lifecycle/requirements.txt` | The IFC converters from ifc-utils and the MQTT client |

The create phase writes four files into `/workspace/common/models`, the folder
the Buildings page reads:

| File | Contents |
|:---|:---|
| `the_kitchen.ifc` | A copy of the building model |
| `the_kitchen.glb` | The geometry, so the page does not convert the model in the browser |
| `the_kitchen.json` | The property tree shown when you click an object |
| `the_kitchen.manifest.json` | One binding per room, from room to MQTT topic |

## Digital Twin Configuration

| Asset Type | Names of Assets | Visibility | Reuse in Other Examples |
|:---|:---|:---|:---|
| Model | the_kitchen.ifc | Common | Yes |
| Tools | ifc-explorer, ifc-converter | Installed by create | Yes |

The publisher reads the broker from these environment variables:

| Variable | Default | Meaning |
|:---|:---|:---|
| `MQTT_HOST` | `localhost` | Host name of the MQTT broker |
| `MQTT_PORT` | `1883` | MQTT port of the broker |
| `MQTT_USERNAME` | not set | User name, when the broker asks for one |
| `MQTT_PASSWORD` | not set | Password, when the broker asks for one |

## Lifecycle Phases

| Lifecycle Phase | Completed Tasks |
|:---|:---|
| Create | Installs the tools, places the model and writes the derived files |
| Execute | Starts the publisher in the background |
| Terminate | Stops the publisher and clears its log |
| Clean | Clears the publisher log |

## Run the Example

Change to the example directory:

```bash
cd /workspace/examples/digital_twins/the_kitchen
```

If required, give the lifecycle scripts execute permission:

```bash
chmod +x lifecycle/*
```

### Create

Installs ifc-explorer, ifc-converter and paho-mqtt into a virtual environment
in `.venv`. Then copies the model into `/workspace/common/models` and writes the
geometry, the property tree and the binding manifest beside it. The conversion
takes about a minute.

```bash
lifecycle/create
```

Open **Buildings** in the DTaaS menu and choose **The Kitchen** to see the
model.

### Execute

Starts publishing a temperature for each room every two seconds. Point it at
the MQTT broker of your installation first, for example the one installed with
the DTaaS platform services:

```bash
export MQTT_HOST=<broker host>
lifecycle/execute
```

Each reading goes to `dtaas/examples/the-kitchen/room-NN/temperature` as one
line of comma-separated fields:

```txt
timestamp,measurement,type,unit,value
20261013T10:00:00,temperature,simulation,°C,21.40
```

The `type` field says `simulation`, so a subscriber can tell these values apart
from measured ones. The log is in `publisher.log`.

### Terminate

Stops the publisher and removes its log:

```bash
lifecycle/terminate
```

## Current Limits

The Buildings page draws the model and resolves the manifest, but the DTaaS
client does not subscribe to MQTT yet. Until it does, the readings reach any
other MQTT subscriber, such as a dashboard, and not the page.

## References

The converters come from the
[ifc-utils](https://github.com/INTO-CPS-Association/ifc-utils) repository. The
manifest format and the Buildings page are described in
[DTaaS issue 1762](https://github.com/INTO-CPS-Association/DTaaS/issues/1762).
