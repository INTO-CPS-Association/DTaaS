# Reusable Assets

Reusable assets make it easier to work with digital twins, and
reusability of assets is a fundamental feature of the platform[1].

## Kinds of Reusable Assets

The DTaaS platform sorts all reusable library assets into
five categories:

![Categories of Library Assets](library-assets.png#only-light)
![Categories of Library Assets](library-assets-dark.png#only-dark)

### Data

The data sources and sinks available to a digital twin.
Typical data sources are sensor measurements from
Physical Twins and test data provided by manufacturers for
calibrating models. Typical data sinks are visualisation
software, external users and data storage services. Some outputs,
such as events and commands, are akin to control outputs
from a Digital Twin. These control outputs usually go to Physical Twins,
but they can also go to another Digital Twin.

### Models

Model assets describe different aspects of Physical Twins
and their environment, at different levels of abstraction, so
the same Physical Twin can have several models.
For example, a flexible robot used in a car production plant may have
structural models that help track the wear and tear
of parts. The same robot can have behavioural models describing the
safety guarantees provided by the robot manufacturer, and
functional models describing what parts the robot can manufacture.

### Tools

Tool assets are software used to create, evaluate and
analyse models. These tools run on a computing
platform, such as an operating system, a virtual machine like the
Java virtual machine, or a docker container.
Tools tend to be platform specific, which makes them less reusable
than models. A tool can be packaged to run on a local or distributed
virtual machine, so the most suitable execution environment can be
chosen for a Digital Twin.
Most models need tools to evaluate them against data inputs.
In some cases, executable packages run as binaries
in a computing environment. Each of these packages combines
models and tools into a ready-to-use Digital Twin.

### Functions

Functions pre-process and post-process data inputs, data outputs
and control outputs. Data science libraries and functions can be used
to create function assets for the platform.
Some Digital Twin models need calibration before use; functions
written by domain experts, together with the right data inputs, can
calibrate them.
Functions can also process the sensor and actuator
data of both Physical Twins and Digital Twins.

### Digital Twins

Ready-to-use digital twins created by one or more users.
They can be reconfigured later for specific use cases.

## File System Structure

Each user's assets are stored in five directories, one for each
category above. In addition, common library assets are available
to all users.
A simplified example of the structure is:

```text
workspace/
  data/
    data1/ (ex: sensor)
      filename (ex: sensor.csv)
      README.md
    data2/ (ex: turbine)
      README.md (remote source; no local file)
    ...
  digital_twins/
    digital_twin-1/ (ex: incubator)
      config (yaml and json)
      README.md (usage instructions)
      description.md (short summary of digital twin)
      lifecycle/ (directory containing lifecycle scripts)
    digital_twin-2/ (ex: mass spring damper)
      config (yaml and json)
      README.md (usage instructions)
      description.md (short summary of digital twin)
      lifecycle/ (directory containing lifecycle scripts)
    digital_twin-3/ (ex: model swap)
      config (yaml and json)
      README.md (usage instructions)
      description.md (short summary of digital twin)
      lifecycle/ (directory containing lifecycle scripts)
    ...
  functions/
    function1/ (ex: graphs)
      filename (ex: graphs.py)
      README.md
    function2/ (ex: statistics)
      filename (ex: statistics.py)
      README.md
    ...
  models/
    model1/ (ex: spring)
      filename (ex: spring.fmu)
      README.md
    model2/ (ex: building)
      filename (ex: building.skp)
      README.md
    model3/ (ex: rabbitmq)
      filename (ex: rabbitmq.fmu)
      README.md
    ...
  tools/
    tool1/ (ex: maestro)
      filename (ex: maestro.jar)
      README.md
    ...
  common/
    data/
    functions/
    models/
    tools/
```

!!! tip
    The DTaaS is agnostic to the format of assets.
    The only requirement is that they are files that can
    be uploaded on the Library page. Directories can be
    compressed into single files and uploaded, then decompressed
    from a terminal or the xfce Desktop available on the
    Workbench page.

A recommended file system structure for storing assets is also
available in
[DTaaS examples](https://github.com/INTO-CPS-Association/DTaaS-examples).

## Upload Assets

Users can upload assets into their workspace from the Library page of
the website.

![Library Page](../../website/images/library.png)

Open a directory and click the **upload** button to upload files or
directories into the workspace. The uploaded assets are then available
in all workbench tools.
The **new** dropdown menu creates new text-based files on the page.
Other files must be uploaded with the **upload** button.

The user workbench provides the following services:

* Jupyter Notebook and Lab
* VS Code
* XFCE Desktop Environment available via VNC
* Terminal

Users can also bring DT assets into their workspaces from external
sources with any of these services. Developers using _git_
repositories can clone from and push to remote git servers. Users can
also use common file transfer protocols such as FTP and SCP to
bring DT assets into their workspaces.

## References

[1]: Talasila, Prasad, et al. "Composable digital twins on Digital Twin
     as a Service platform." Simulation 101.3 (2025): 287-311.
