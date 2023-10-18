# Mass Spring Damper

## Overview

The mass spring damper study comprises two mass spring dampers
and demonstrates how the sucessive substitution technique can
be used to ensure that a co-simulation is stable. More information
about successive substitution and other co-simulation stabilization
techniques, please see [this paper](https://arxiv.org/pdf/1702.00686v1).

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

This is a co-simulation based digital twin. The `co-sim.json` and `time.json` are two configuration files used for executing the digital twin.

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

If required, change the permission of files you need to execute, for example:

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
_workspace/examples/data/mass-spring-damper/output directory_.

You can also view run logs in the
_workspace/examples/digital_twins/mass-spring-damper_.