# Mass Spring Damper

## Overview

The mass spring damper digital twin (DT) comprises two mass spring dampers
and demonstrates how a co-simulation based DT can be used within DTaaS.

## Example Diagram

![Mass Spring Damper System](mass-spring-damper_multibody_system.png)

## Example Structure

There are two simulators included in the study, each representing a
mass spring damper system. The first simulator calculates the mass
displacement and speed of $m_1$ for a given force $F_k$ acting on mass $m_1$.
The second simulator calculates force $F_k$ given a displacement and speed of
mass $m_1$. By coupling these simulators, the evolution of the position of
the two masses is computed.

![Mass Spring Damper Structure](dt-structure.png)

## Configuration of assets

This example uses two models and one tool. The specific assets used are:

| Asset Type | Names of Assets | Visibility | Reuse in Other Examples |
|:---|:---|:---|:---|
| Models | MassSpringDamper1.fmu | Private | Yes |
|  | MassSpringDamper2.fmu | Private | Yes |
| Tool | maestro-2.3.0-jar-with-dependencies.jar | Common | Yes |

The `co-sim.json` and `time.json`
are two DT configuration files used for executing the digital twin.

## Lifecycle Phases

| Lifecycle Phase    | Completed Tasks |
| -------- | ------- |
| Create  | Installs Java Development Kit for Maestro tool    |
| Execute | Produces and stores output in data/mass-spring-damper/output directory|
| Clean   | Clears run logs and outputs |

## Run the example

To run the example, change your present directory.

```bash
cd workspace/examples/digital_twins/mass-spring-damper
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
at `data/mass-spring-damper/output/output.csv`.

There are also debug and maestro log files stored in
`data/mass-spring-damper/output` directory.

```bash
lifecycle/execute
```

#### Examine the results

The results can be found in the
_workspace/examples/data/mass-spring-damper/output directory_.

You can also view run logs in the
_workspace/examples/digital_twins/mass-spring-damper_.

### Terminate phase

Terminate to clean up the debug files and co-simulation output files.

```bash
lifecycle/terminate
```

## References

More information about co-simulation techniques and mass spring damper
case study are available in:

Gomes, Cláudio, et al. "Co-simulation: State of the art."
arXiv preprint arXiv:1702.00686 (2017).
