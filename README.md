# Motivation

The Digital Twin as a Service (DTaaS) software shall be used for creating a Digital Twin support platform for SMEs. The documentation and a research paper draft are available in `docs/` directory.

## Installation

The best way to use the DTaaS software is via a vagrant virtual machine. The install instructions in `deploy/vagrant/single-machine/README.pdf` should help you get started. If you face any issues, please open an [issue](https://github.com/INTO-CPS-Association/DTaaS/issues/new/choose).

## Directory Structure

| Directory | Contents |
|:---|:---|
| client | Code files for building and hosting web client |
| deploy | Vagrant scripts for creating vagrant boxes and deploying DTaaS on a single vagrant virtual machine |
| docs | Top-level project documentation |
| files | Directories used for serving the user files. This installation has one user named **user1** |
| servers | Contains configuration files for Traefik gateway |
||

## License

This software is owned by [The INTO-CPS Association](https://into-cps.org/) and is available under [the INTO-CPS License](./LICENSE.txt).
