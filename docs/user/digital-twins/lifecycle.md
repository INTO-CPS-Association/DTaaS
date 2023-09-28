# Digital Twin Lifecycle

![Digital Twin Lifecycle](lifecycle.png)

A DT lifecycle consists of **explore, create, execute, save, analyse, evolve**
and **terminate** phases.

| Phase | Main Activities |
|:----|:----|
| **explore** | selection of suitable assets based on the user needs and checking their compatibility for the purposes of creating a DT. |
| **create** | specification of DT configuration. If DT already exists, there is no creation phase at the time of reuse. |
| **execute** | automated / manual execution of a DT based on its configuration. The DT configuration must checked before starting the execution phase. |
| **analyse** | checking the outputs of a DT and making a decision. The outputs can be text files, or visual dashboards. |
| **evolve** | reconfigure DT primarily based on analysis. |
| **save** | involves saving the state of DT to enable future recovery. |
| **terminate** | stop the execution of DT. |

A complete digital twin will support all the phases but it is not mandatory.

Even though not mandatory, having a coding structure makes it easy
to manage DT lifecycle phases. It is recommended to have the following structure

```text
workspace/
  digital twins/
    digital-twin-1/
      lifecycle/
        analyze
        clean
        evolve
        execute
        save
        terminate
```

A dedicated program exists for each phase of DT lifecycle.
Each program can be as simple as a script that launches other
programs or sends messages to a live digital twin.

## Examples

Here are the programs / scripts to manage three phases
in the lifecycle of **mass-spring-damper DT**.

```bash title="lifecycle/execute"
#!/bin/bash
mkdir -p /workspace/data/mass-spring-damper/output
#cd ..
java -jar /workspace/common/tools/maestro-2.3.0-jar-with-dependencies.jar \
    import -output /workspace/data/mass-spring-damper/output \
    --dump-intermediate sg1 cosim.json time.json -i -vi FMI2 \
    output-dir>debug.log 2>&1
```

The execute phases uses the DT configuration, FMU models and Maestro
tool to execute the digital twin. The script also stores the output of
cosimulation in `/workspace/data/mass-spring-damper/output`.

It is possible for a DT not to support a specific lifecycle phase.
This intention can be specified with an empty script and a helpful
message if deemed necessary.

```bash title="lifecycle/analyze"
#!/bin/bash
printf "operation is not supported on this digital twin"
```

The lifecycle programs can call other programs in the code base.
In the case of `lifecycle/terminate` program, it is calling another
script to do the necessary job.

```bash title="lifecycle/terminate"
#!/bin/bash
lifecycle/clean
```
