# Mass Spring Damper

## Overview

The mass spring damper digital twin (DT) comprises two mass spring dampers
and demonstrates how a co-simulation based DT can be used within the DTaaS
with full DevOps automation.

## Example Diagram

![Mass Spring Damper System](https://raw.githubusercontent.com/INTO-CPS-Association/DTaaS-examples/devops/digital_twins/mass-spring-damper/mass-spring-damper_multibody_system.png)

## Example Structure

There are two simulators included in the study, each representing a
mass spring damper system. The first simulator calculates the mass
displacement and speed of $m_1$ for a given force $F_k$ acting on mass $m_1$.
The second simulator calculates force $F_k$ given a displacement and speed of
mass $m_1$. By coupling these simulators, the evolution of the position of
the two masses is computed.

![Mass Spring Damper Structure](https://raw.githubusercontent.com/INTO-CPS-Association/DTaaS-examples/devops/digital_twins/mass-spring-damper/dt-structure.png)

## Digital Twin Configuration

This example uses two models and one tool. The specific assets used are:

| Asset Type | Names of Assets | Visibility | Reuse in Other Examples |
| :--------- | :-------------------------------------- | :--------- | :---------------------- |
| Models | MassSpringDamper1.fmu | Private | Yes |
| | MassSpringDamper2.fmu | Private | Yes |
| Tool | maestro-2.3.0-jar-with-dependencies.jar | Common | Yes |

The `co-sim.json` and `time.json` are two DT configuration files
used for executing the digital twin.
These two files can be modified to customise the DT for specific requirements.

## Lifecycle Phases

| Lifecycle Phase | Completed Tasks |
| --------------- | --------------------------------------------------------------- |
| Create | Installs Java Development Kit for Maestro tool |
| Execute | Produces and stores output in data/mass-spring-damper/output directory |
| Clean | Clears run logs and outputs |

## DevOps Automation

The `.gitlab-ci.yml` file controls the sequence of executing the lifecycle
scripts of this example. All lifecycle scripts are placed in a single
stage named `build_and_run`.

Co-simulation outputs are saved as artifacts in the GitLab pipeline and
can be accessed at
`https://<gitlab-host>/<group>/<username>/-/artifacts`.

## Run the Example

To run the example, change your present directory:

```bash
cd /workspace/examples/digital_twins/mass-spring-damper
```

If required, change the execute permission of lifecycle scripts:

```bash
chmod +x lifecycle/create
chmod +x lifecycle/execute
chmod +x lifecycle/terminate
```

### Create

Installs Open Java Development Kit 17 in the workspace.

```bash
lifecycle/create
```

### Execute

Runs the co-simulation using the Maestro tool with the two FMU models.

```bash
lifecycle/execute
```

The results can be found in the
`/workspace/examples/data/mass-spring-damper/output` directory.

### Terminate

Cleans up debug files and co-simulation output files.

```bash
lifecycle/terminate
```

## References

More information about co-simulation techniques and the mass spring damper
case study are available in:

```txt
Gomes, Cláudio, et al. "Co-simulation: State of the art."
arXiv preprint arXiv:1702.00686 (2017).
```

The source code for the models used in this DT are available in the
[mass spring damper](https://github.com/INTO-CPS-Association/example-mass_spring_damper)
GitHub repository.
