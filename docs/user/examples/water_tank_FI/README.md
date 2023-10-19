# Water Tank Fault Injection

## Overview

The co-simulation is composed of a water-tank,
and a controller, which aims to maintain the level
in the water-tank between ```1``` and ```2```.
More details on this case-study can be found
[here](https://github.com/INTO-CPS-Association/example-single_watertank).

To run an experiment with fault-injection,
we inject a fault in the input of the tank
(control signal from controller to open or close),
such that between time 12 and 20, this signal is
always closed, irrespective of the actual level
in the tank.

## Example Diagram

![Water Tank System](watertank.png)

## Example Structure

![Water Tank Structure](dt_structure.png)

## Configuration of assets

This example uses two models and one tool.
The specific assets used are:

| Asset Type | Names of Assets | Visibility | Reuse in Other Examples |
|:---|:---|:---|:---|
| Models | watertankcontroller-c.fmu | Private | Yes |
|  | singlewatertank-20sim.fmu | Private | Yes |
| Tool | maestro-2.3.0-jar-with-dependencies.jar | Common | Yes |

## Lifecycle Phases

| Lifecycle Phase    | Completed Tasks |
| -------- | ------- |
| Create  | Installs Java Development Kit for Maestro tool    |
| Execute | Produces and stores output in data/water_tank_FI/output directory|
| Clean   | Clears run logs and outputs |

## Run the example

To run the example, change your present directory.

```bash
cd workspace/examples/digital_twins/water_tank_FI
```

If required, change the permission of files you
need to execute, for example:

```bash
chmod +x lifecycle/create
```

Now, run the following scripts:

### Create

```bash
lifecycle/create
```

### Execute

```bash
lifecycle/execute
```

## Examine the results

The results can be found in the
_workspace/examples/data/water_tank_FI/output directory_.

You can also view run logs in the
_workspace/examples/digital_twins/water_tank_FI_.