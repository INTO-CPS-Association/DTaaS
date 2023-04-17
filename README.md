# Motivation

The Digital Twin as a Service (DTaaS) software shall be used for creating a Digital Twin support platform for SMEs. A brief overview of the software is available in [this presentation](docs/DTaaS-overview.pdf) and [recorded video](https://www.dropbox.com/s/mgxxf5chp9b130x/DTaaS%20presentation%20and%20brainstorming-20230317.mp4?dl=1). There is also a [research paper draft](docs/DTaaS-Paper-Draft.pdf) if you are interested in reading the scientific roadmap for this software.

This is a mono repo containing code for both the web client and the microservices code base. Only the [web client](client) and [library microservice](servers/lib) components are functional at present. Everything else is a work-in-progress.

### Installation

The best way to use the DTaaS software is via a vagrant virtual machine. The install instructions for [single node vagrant machine](deploy/vagrant/single-machine/README.md) should help you get started. If you face any issues, please open an [issue](https://github.com/INTO-CPS-Association/DTaaS/issues/new/choose).

## Development Setup

The rest of the information on this page is aimed at current and potential contributors to DTaaS software development.

To install the development environment, run

```bash
bash script/install.bash
```

Before you make commits, please install the git hooks provided in the repository.

```shell
script/configure-git-hooks.sh
```

This will ensure that your commits are formatted correctly and that the unittests pass before you push your changes. Be aware that the tests take a long time to run. If you want to skip the tests or formatting, you can use the `--no-verify` flag on `git commit` or `git push`.

### Infrastructure Components

The application uses [Træfik](https://github.com/traefik/traefik) and [ML Workspace](https://github.com/ml-tooling/ml-workspace) open-source components. It is possible to run [jupyterlab notebooks](script/jupyter.sh), [Grafana servers](script/grafana.sh) and [InfluxDB](script/influx.sh) as part of the DTaaS software. But terminal-based Jupyterlab, Grafana and InfluxDB are not installed in the default setup.

## License

This software is owned by [The INTO-CPS Association](https://into-cps.org/) and is available under [the INTO-CPS License](./LICENSE.txt).
