# Create a Digital Twin

A digital twin is built from the assets available in the workspace.
To bring assets or files from a local computer into the DTaaS workspace,
follow the instructions in [library assets](../servers/lib/assets.md).

The library assets depend on one another as shown below.

![Relation between reusable assets](asset-relationship.png)

A digital twin is created by linking assets in a meaningful way.
The relationship can be written as:

$$
D_t: \{ D{^*},M^{*},(FT)^{+} \}C_{dt}
$$

where D denotes data, M denotes models, F denotes functions, T denotes tools,
$C_{dt}$ denotes DT configuration, and $D_t$ is a symbolic notation for
a digital twin itself. The $\{ D{^*},M^{*},(FT)^{+} \}C_{dt}$ expression
denotes composition of a DT from D, M, T, and F assets. The $*$ indicates zero
or more instances of an asset, and $+$ indicates one or more instances
of an asset.

The DT configuration specifies which assets to use and any parameters
to set for them. When a DT requires RabbitMQ, InfluxDB, or similar
services supported by the platform, the DT configuration must include
access credentials for these services.

This generic DT definition is based on DT examples observed in practice,
and a DT may deviate from it. The only requirement is that the DT can be
executed from either the command line or a graphical desktop environment.

!!! tip
    If you are new to digital twins and do not have separate digital
    twin assets, only a single directory containing all components,
    upload this monolithic digital twin into the
    **digital_twins/your_digital_twin_name** directory.

## Example

The [Examples](https://github.com/INTO-CPS-Association/DTaaS-examples)
repository contains a co-simulation setup for a mass-spring-damper system.
The example shows how co-simulation can be used in a digital twin.

The file system contents for this example are:

```text
workspace/
  data/
    mass-spring-damper
        input/
        output/

  digital_twins/
    mass-spring-damper/
      cosim.json
      time.json
      lifecycle/
        analyze
        clean
        evolve
        execute
        save
        terminate
      README.md

  functions/
  models/
    MassSpringDamper1.fmu
    MassSpringDamper2.fmu

  tools/
  common/
    data/
    functions/
    models/
    tools/
        maestro-2.3.0-jar-with-dependencies.jar
```

The `workspace/data/mass-spring-damper/` directory contains `input` and
`output` data for the mass-spring-damper digital twin.

The two FMU models required for this digital twin are in the
`models/` directory.

The co-simulation digital twin requires the Maestro co-simulation
orchestrator. Maestro is reusable across all co-simulation-based DTs,
so it is placed in the `common/tools/` directory.

The digital twin configuration is in the
`digital_twins/mass-spring-damper` directory. The co-simulation configuration
is defined in two JSON files: `cosim.json` and `time.json`.
Documentation for the digital twin goes in
`digital_twins/mass-spring-damper/README.md`.

The launch program for this digital twin is
`digital_twins/mass-spring-damper/lifecycle/execute`. It runs
the co-simulation until completion and then exits.
The programs in `digital_twins/mass-spring-damper/lifecycle` manage the
lifecycle of this digital twin.
The [lifecycle page](lifecycle.md) explains these programs.

!!! Abstract "Execution of a Digital Twin"
    A frequent question concerns the run time of a digital twin.
    The natural intuition is that a digital twin must operate
    as long as its physical twin is in operation.
    **If a digital twin runs for a finite time and then ends, can it be
    called a digital twin?**
    **Yes.** The Industry 4.0 use cases seen among SMEs have digital
    twins that run for a finite time. Users often run these digital
    twins when they choose to.

**To execute this digital twin:**

1. Open the **Workbench** page of the DTaaS website and click the
   **Desktop** tool. The desktop opens in a new browser tab.
1. The tab shows the VNC Desktop with a connect button. Click **Connect**
   to connect to the Linux desktop of the workspace.
1. Open a terminal (the black rectangular icon in the top left region
   of the tab) and enter the commands below.
1. Download the example files by following the instructions in the
   [examples overview](../examples/index.md).

1. Go to the digital twin directory and run:

   ```sh
   cd /workspace/examples/digital_twins/mass-spring-damper
   lifecycle/execute
   ```

   The last command executes the mass-spring-damper digital twin and stores
   the co-simulation output in `data/mass-spring-damper/output`.
