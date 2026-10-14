# Mass Spring Damper

## Overview

The mass spring damper digital twin (DT) has two mass spring dampers.
It shows how to use a co-simulation based DT within the DTaaS.

## Example Diagram

![Mass Spring Damper System](mass-spring-damper_multibody_system.png){ .on-white }

## Example Structure

The study includes two simulators, each representing a mass spring damper
system. The first simulator calculates the displacement and speed of mass
$m_1$ for a given force $F_k$ acting on $m_1$. The second simulator
calculates the force $F_k$ from a given displacement and speed of mass
$m_1$. Coupling the two simulators computes how the positions of the two
masses evolve.

![Mass Spring Damper Structure](dt-structure.png)

## Digital Twin Configuration

This example uses two models and one tool:

| Asset Type | Names of Assets                         | Visibility | Reuse in Other Examples |
| :--------- | :-------------------------------------- | :--------- | :---------------------- |
| Models     | MassSpringDamper1.fmu                   | Private    | Yes                     |
|            | MassSpringDamper2.fmu                   | Private    | Yes                     |
| Tool       | maestro-2.3.0-jar-with-dependencies.jar | Common     | Yes                     |

The DT is executed with two configuration files, `cosim.json` and
`time.json`. Edit them to customise the DT.

## Lifecycle Phases

| Lifecycle Phase | Completed Tasks                                                        |
| --------------- | ---------------------------------------------------------------------- |
| Create          | Installs Java Development Kit for Maestro tool                         |
| Execute         | Produces and stores output in data/mass-spring-damper/output directory |
| Clean           | Clears run logs and outputs                                            |

## Run the example

To run the example, change to the example directory.

```bash
cd /workspace/examples/digital_twins/mass-spring-damper
```

If required, make the lifecycle scripts executable, for example:

```bash
chmod +x lifecycle/create
```

Then run the following scripts.

### Create

Installs Open Java Development Kit 17 in the workspace.

```bash
lifecycle/create
```

### Execute

Runs the digital twin. Because this is a co-simulation based digital twin,
the Maestro co-simulation tool runs a co-simulation of the two FMU models.

```bash
lifecycle/execute
```

#### Examine the Results

The results are in the
_/workspace/examples/data/mass-spring-damper/output directory_.

The run logs are in
_/workspace/examples/digital_twins/mass-spring-damper_.

### Terminate phase

Removes the debug files and co-simulation output files.

```bash
lifecycle/terminate
```

## References

More information about co-simulation techniques and the mass spring damper
case study is available in:

```txt
Gomes, Cláudio, et al. "Co-simulation: State of the art."
arXiv preprint arXiv:1702.00686 (2017).
```

The source code for the models used in this DT is in the
[mass spring damper](https://github.com/INTO-CPS-Association/example-mass_spring_damper)
GitHub repository.
