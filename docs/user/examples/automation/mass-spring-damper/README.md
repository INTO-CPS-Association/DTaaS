# Mass Spring Damper

## Overview

The mass spring damper digital twin (DT) has two mass spring dampers
and shows how a co-simulation based DT can be used within DTaaS.

## Example Diagram

![Mass Spring Damper System](mass-spring-damper_multibody_system.png){.on-white}

## Example Structure

The study includes two simulators, each representing a
mass spring damper system. The first simulator calculates the mass
displacement and speed of $m_1$ for a given force $F_k$ acting on mass $m_1$.
The second simulator calculates force $F_k$ given a displacement and speed of
mass $m_1$. By coupling these simulators, the evolution of the position of
the two masses is computed.

![Mass Spring Damper Structure](../../workspace/mass-spring-damper/dt-structure.png#only-light)
![Mass Spring Damper Structure](../../workspace/mass-spring-damper/dt-structure-dark.png#only-dark)

## Digital Twin Configuration

This example uses two models and one tool:

| Asset Type | Names of Assets                         | Visibility | Reuse in Other Examples |
| :--------- | :-------------------------------------- | :--------- | :---------------------- |
| Models     | MassSpringDamper1.fmu                   | Private    | Yes                     |
|            | MassSpringDamper2.fmu                   | Private    | Yes                     |
| Tool       | maestro-2.3.0-jar-with-dependencies.jar | Common     | Yes                     |

The `cosim.json` and `time.json` files configure the execution of
the digital twin. Edit them to customise the DT.

## Lifecycle Phases

| Lifecycle Phase | Completed Tasks                                                        |
| --------------- | ---------------------------------------------------------------------- |
| Create          | Installs the Java runtime for the Maestro tool                         |
| Execute         | Produces and stores output in data/mass-spring-damper/output directory |
| Clean           | Clears run logs and outputs                                            |

## DevOps Automation

This example uses the DevOps features of the DTaaS platform, which
the DTaaS provides through GitLab DevOps pipelines.

The `.gitlab-ci.yml` file sets the order in which the lifecycle scripts
of the example run. Its configuration format lets you split a program
into stages. This first example runs the create and execute scripts
in a single stage named _build_and_run_.

GitLab saves the co-simulation outputs as job artefacts. You can find
them at
`https://<gitlab-host>/<group>/<username>/-/artifacts`.
Replace `<gitlab-host>`, `<group>`, and `<username>` with the values for
your GitLab instance and project.

## Run the example

To run the example, go to the following directory.

```bash
cd /workspace/examples/digital_twins/mass-spring-damper
```

If required, make the lifecycle scripts executable, for example:

```bash
chmod +x lifecycle/create
```

Now, run the following scripts:

### Create

Installs the OpenJDK 17 Java runtime in the workspace.

```bash
lifecycle/create
```

### Execute

Runs the digital twin. Because this is a co-simulation based
digital twin, the Maestro co-simulation tool runs a co-simulation
of the two FMU models.

```bash
lifecycle/execute
```

#### Examine the results

The results are in the
_/workspace/examples/data/mass-spring-damper/output_ directory.

The run logs are in the
_/workspace/examples/digital_twins/mass-spring-damper_ directory.

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

The source code for the models used in this DT is available in the
[mass spring damper](https://github.com/INTO-CPS-Association/example-mass_spring_damper)
GitHub repository.
