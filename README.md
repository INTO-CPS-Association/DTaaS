# Motivation

The Digital Twin as a Service (DTaaS) software
is useful to create and run digital twins.
The digital twins that are running can be
used as service by other users.
These users need not be members of
the DTaaS software platform itself.

There is an overview of the software available for:

* General users -
  [overview slides](https://odin.cps.digit.au.dk/into-cps/dtaas/assets/DTaaS-short-intro.pdf)
  and
  [overview video](https://odin.cps.digit.au.dk/into-cps/dtaas/assets/videos/DTaaS-short-intro.mp4),
  [feature walkthrough](https://odin.cps.digit.au.dk/into-cps/dtaas/assets/videos/dtaas-v0.2.0-demo.mp4)
* Developers - [slides](https://odin.cps.digit.au.dk/into-cps/dtaas/assets/DTaaS-overview.pdf)
  and [video](https://odin.cps.digit.au.dk/into-cps/dtaas/assets/videos/DTaaS-overview.mkv).

There is also a
[research paper draft](https://arxiv.org/abs/2305.07244)
if you are interested in
reading the scientific roadmap for this software.

This is a mono repo containing code for
both the web client and the microservices code base.
Only the [web client](client) and
[library microservice](servers/lib)
components are functional at present.
Everything else is a work-in-progress.

## Documentation

The software comes with
[documentation](https://into-cps-association.github.io/DTaaS/)
for administrators and users.
You are welcome to open an issue
if there is a suggestion on improving the documentation.

## Installation

The software can be installed either on
Ubuntu Server 22.04 Operating System or
on vagrant virtual machine(s).
The installation instructions and scripts in `deploy/`
should help you get started.
If you face any issues,
please open an
[issue](https://github.com/INTO-CPS-Association/DTaaS/issues/new/choose).

Some of the services like InfluxDB
require a dedicated hostname.
Thus successful installation of these services
is dependent on your ability to use
multiple hostnames for different services.
There are dedicated installation scripts
for services in `script/`.

## Development Setup

The rest of the information on this page
is aimed at current and potential contributors
to DTaaS software development.

To install the development environment, run

```bash
bash script/env.sh
```

There is a script to download all the docker containers used in the project.
You can download them using

```bash
bash script/docker.sh
```

**CAVEAT**: The docker images are large and are likely to consume
about 5GB of bandwidth and 15GB of space.
You will have to download the docker images on a really good network.

Before you make commits, please install the git hooks provided in the repository.

```bash
bash script/configure-git-hooks.sh
```

This will ensure that your commits are formatted
correctly and that the unittests pass before you
push your changes.
Be aware that the tests take a long time to run.
If you want to skip the tests or formatting,
you can use the `--no-verify` flag
on `git commit` or `git push`.

### Infrastructure Components

The application uses
[Træfik](https://github.com/traefik/traefik) and
[ML Workspace](https://github.com/ml-tooling/ml-workspace)
open-source components.
It is possible to run jupyterlab notebooks,
[Grafana servers](script/grafana.sh),
[InfluxDB](script/influx.sh) and
[RabbitMQ](https://github.com/rabbitmq/rabbitmq-server)
as part of the DTaaS software.

## License

This software is owned by
[The INTO-CPS Association](https://into-cps.org/)
and is available under [the INTO-CPS License](./LICENSE.md).

The DTaaS software platform uses
[Træfik](https://github.com/traefik/traefik),
[ML Workspace](https://github.com/ml-tooling/ml-workspace),
[Grafana](https://github.com/grafana/grafana),
[InfluxDB](https://github.com/influxdata/influxdb) and
[RabbitMQ](https://github.com/rabbitmq/rabbitmq-server)
open-source components.
These software components have their own licenses.
