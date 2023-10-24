# Three-Tank System Digital Twin

## Overview

The three-tank system is a simple case study
allows us to represent a system that is composed
of three individual components that are coupled
in a cascade as follows: The first tank is connected
to the input of the second tank, and the output of
the second tank is connected to the input of the
third tank.

This example contains only the simulated components
for demonstration purposes; therefore, there is no
configuration for the connection with the physical system.

## Example Diagram

## Example Structure

The three-tank system case study
is managed using the ```DTManager```,
which is packed as a jar library in the tools,
and run from a java main file.
The ```DTManager``` uses Maestro as a slave for
co-simulation, so it generates
the output of the co-simulation.

The three instances use the same ```Linear.fmu``` file
and the same schema due to being of the same object class.

![Three Tank Structure](dt-structure.png)

## Configuration of assets

This example uses one model class and one tool.
The specific assets used are:

| Asset Type | Names of Assets | Visibility | Reuse in Other Examples |
|:---|:---|:---|:---|
| Models | Linear.fmu | Private | Yes |
| Tool | DTManager-0.0.1-Maestro.jar | Common | Yes |

## Lifecycle Phases

| Lifecycle Phase    | Completed Tasks |
| -------- | ------- |
| Create  | Installs Java Development Kit for Maestro tool    |
| Execute | Produces and stores output in data/three-tank/output directory|
| Clean   | Clears run logs and outputs |

## Run the example

To run the example, change your present directory.

```bash
cd workspace/examples/digital_twins/three-tank
```

If required, change the execute permission of lifecycle scripts
you need to execute, for example:

```bash
chmod +x lifecycle/create
```

Now, run the following scripts:

### Create

Installs Open Java Development Kit 17 in the workspace.

```bash
lifecycle/create
```

### Execute

Run the co-simulation. Generate the co-simulation output.csv file
at `data/three-tank/output/output.csv`.

There are also debug and maestro log files stored in
`data/three-tank/output` directory.

```bash
lifecycle/execute
```

#### Examine the results

Executing this Digital Twin will generate a co-simulation output,
but the results can also be monitored from updating the
```/workspace/examples/tools/three-tank/TankMain.java```
with a specific set of ```getAttributeValue``` commands,
such as shown in the code.
That main file enables the online execution of the
Digital Twin and its internal components.

The results can be found in the
_workspace/examples/data/three-tank/output directory_.

You can also view run logs in the
_workspace/examples/digital_twins/three-tank_.

### Terminate phase

Terminate to clean up the debug files and co-simulation output files.

```bash
lifecycle/terminate
```

## References

More information about this example is available
here: