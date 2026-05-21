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

## Digital Twin Configuration

This example uses two models and one tool. The specific assets used are:

| Asset Type | Names of Assets                         | Visibility | Reuse in Other Examples |
| :--------- | :-------------------------------------- | :--------- | :---------------------- |
| Models     | MassSpringDamper1.fmu                   | Private    | Yes                     |
|            | MassSpringDamper2.fmu                   | Private    | Yes                     |
| Tool       | maestro-2.3.0-jar-with-dependencies.jar | Common     | Yes                     |

The `co-sim.json` and `time.json`
are two DT configuration files used for executing the digital twin.
These two files can be modified to customise the DT as required.

## Lifecycle Phases

| Lifecycle Phase | Completed Tasks                                                        |
| --------------- | ---------------------------------------------------------------------- |
| Create          | Installs Java Development Kit for Maestro tool                         |
| Execute         | Produces and stores output in data/mass-spring-damper/output directory |
| Clean           | Clears run logs and outputs                                            |

## DevOps Automation

This example demonstrates the use of DevOps features of the DTaaS platform.
The GitLab DevOps pipelines are used for providing this feature in the DTaaS.

The `.gitlab-ci.yml` file controls the sequence of executing the lifecycle
scripts of the example. The configuration format of `.gitlab-ci.yml`
permits specifying stages for execution of a program.
In this first example, all the lifecycle scripts are put in single stage,
namely _build_and_run_.

This example produces co-simulation outputs which are then saved in
the artefacts repository of the GitLab. These can be accessed at
`https://<gitlab-host>/<group>/<username>/-/artifacts`.
Replace `<gitlab-host>`, `<group>`, and `<username>` with the values for
your GitLab instance and project.

## Run the example

To run the example, navigate to the following directory.

```bash
cd /workspace/examples/digital_twins/mass-spring-damper
```

If required, change the execute permission of the lifecycle scripts
to be executed, for example:

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

Run the Digital Twin. Since this is a co-simulation based
digital twin, the Maestro co-simulation tool executes co-simulation
using the two FMU models.

```bash
lifecycle/execute
```

#### Examine the results

The results can be found in the
_/workspace/examples/data/mass-spring-damper/output_ directory.

You can also view run logs in the
_/workspace/examples/digital_twins/mass-spring-damper_.

### Terminate phase

Terminate to clean up the debug files and co-simulation output files.

```bash
lifecycle/terminate
```

## References

More information about co-simulation techniques and mass spring damper
case study are available in:

```txt
Gomes, Cláudio, et al. "Co-simulation: State of the art."
arXiv preprint arXiv:1702.00686 (2017).
```

The source code for the models used in this DT are available in
[mass spring damper](https://github.com/INTO-CPS-Association/example-mass_spring_damper)
github repository.
