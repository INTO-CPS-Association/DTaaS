# :recycle: Digital Twin Lifecycle

Physical products in the real world go through a product lifecycle.
A simplified four-stage product lifecycle is shown here.

A digital twin that tracks physical products (twins) must
evolve together with the corresponding physical twin.

The figure shows the activities that can take place in each
lifecycle phase.

![DT-PT Lifecycle](lifecycle-four-stages.png)

(Ref: Minerva, R, Lee, GM and Crespi, N (2020) Digital Twin
in the IoT context: a survey on technical features, scenarios
and architectural models. Proceedings of the IEEE, 108 (10).
pp. 1785-1824. ISSN 0018-9219.)

## Lifecycle Phases

The four-phase lifecycle has been extended to a lifecycle with
seven phases. This section lists the phase names and the typical
activities in each phase[1].

 A DT lifecycle consists of **explore, create, execute, save, analyse, evolve**
 and **terminate** phases.

| Phase         | Main Activities                                                                                                                         |
| :------------ | :-------------------------------------------------------------------------------------------------------------------------------------- |
| **explore**   | Selection of suitable assets based on user requirements and verification of their compatibility for DT creation.                        |
| **create**    | Specification of DT configuration. For existing DTs, no creation phase is required at the time of reuse.                                |
| **execute**   | Automated or manual execution of a DT based on its configuration. The DT configuration must be verified before starting execution.      |
| **analyse**   | Examination of DT outputs and decision-making. Outputs may include text files or visual dashboards.                                     |
| **evolve**    | Reconfiguration of DT primarily based on analysis results.                                                                              |
| **save**      | Preservation of DT state to enable future recovery.                                                                                     |
| **terminate** | Cessation of DT execution.                                                                                                              |

A digital twin that faithfully tracks the physical twin lifecycle must
support all the phases. Digital twin engineers may also add their own
phases, so the DTaaS platform is designed to accommodate different DTs.

One possible linear sequence of the tasks in a digital twin
lifecycle is shown here.

![Digital Twin Lifecycle](lifecycle.png)

This is only one possible pathway. The order of the steps
can be changed as needed.

The lifecycle phases can be mapped to
the <font color="orange"> **Build-Use-Share**</font> approach
of the DTaaS platform.

![DT Lifecycle and Build-Use-Share](build-use-share.png)

A matching code structure is not mandatory, but it makes DT creation
and management within the DTaaS platform easier.
The recommended structure is:

```text
workspace/
  digital_twins/
    digital-twin-1/
      lifecycle/
        analyze
        clean
        evolve
        execute
        save
        terminate
```

Each phase of the DT lifecycle has its own program. A program
can be as simple as a script that launches other programs or sends messages
to a live digital twin.

:fontawesome-solid-circle-info: **The recommended way to implement lifecycle**
**phases within DTaaS is with scripts, for example shell scripts.**

## Example Lifecycle Scripts

The following example scripts manage three phases in
the lifecycle of the **mass-spring-damper DT**.

```bash title="lifecycle/execute"
#!/bin/bash
mkdir -p /workspace/data/mass-spring-damper/output
#cd ..
java -jar /workspace/common/tools/maestro-2.3.0-jar-with-dependencies.jar \
    import -output /workspace/data/mass-spring-damper/output \
    --dump-intermediate sg1 cosim.json time.json -i -vi FMI2 \
    output-dir>debug.log 2>&1
```

The execute phase uses the DT configuration, the FMU models and the
Maestro tool to execute the digital twin. The script stores the
co-simulation output in `/workspace/data/mass-spring-damper/output`.

A DT may not support every lifecycle phase. An unsupported phase can
be an empty script, with a message if needed.

```bash title="lifecycle/analyze"
#!/bin/bash
printf "operation is not supported on this digital twin"
```

The lifecycle programs can invoke other programs in the codebase.
For example, the `lifecycle/terminate` program calls another
script to do its work.

```bash title="lifecycle/terminate"
#!/bin/bash
lifecycle/clean
```

## References

[1]: Talasila, Prasad, et al. "Composable digital twins on Digital Twin
     as a Service platform." Simulation 101.3 (2025): 287-311.
