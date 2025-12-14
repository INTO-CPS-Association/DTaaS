# Overview

## Install

The objective is to install and administer the DTaaS platform for users.

<!-- markdownlint-disable MD046 -->
<!-- prettier-ignore -->
!!! warning
    The DTaaS platform has been developed and tested on
    [docker CE v28](https://docs.docker.com/engine/release-notes/28/).
    The software does not work on
    [docker CE v29](https://docs.docker.com/engine/release-notes/29/) yet.
<!-- markdownlint-enable MD046 -->

The DTaaS platform can be installed in different ways.
Each version serves a different purpose.

<!-- markdownlint-disable MD046 -->
<!-- prettier-ignore -->
!!! tip "Easy Setup on Localhost"

    The [localhost](localhost.md) installation is easy for
    first time users. Please give it a try.
<!-- markdownlint-enable MD046 -->

Otherwise, the installation setup that fits specific needs should be selected.

| Installation Setup                               | Purpose                                                                                                                                                                                                        |
| :----------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [localhost](localhost.md)                        | Installation of the DTaaS on a local computer for a single user; does not require a web server. _This setup does not require a domain name._                                                                   |
| [secure localhost](./localhost-secure.md)        | Installation of the DTaaS on a local computer for a single user over HTTPS with integrated [GitLab installation](gitlab/index.md); does not require a web server. _This setup does not require a domain name._ |
| [Server](server.md)                              | Installation of the DTaaS on a server for multiple users. The [requirements](requirements.md) should be reviewed. Hosting over HTTPS with integrated [GitLab installation](gitlab/index.md) is also available. |
| [One vagrant machine](vagrant/single-machine.md) | Installation of the DTaaS on a virtual machine; can be used for single or multiple users.                                                                                                                      |
| [Two vagrant machines](vagrant/two-machines.md)  | Installation of the DTaaS on two virtual machines; can be used for single or multiple users.                                                                                                                   |
|                                                  | The core DTaaS platform is installed on the first virtual machine, and all services (RabbitMQ, MQTT, InfluxDB, Grafana and MongoDB) are installed on the second virtual machine.                               |
| [Independent Packages](packages.md)              | Can be used independently; does not require full installation of the DTaaS.                                                                                                                                    |

The [installation steps](steps.md) is a recommended starting point for
the installation process.

## Administer

A [CLI](cli.md) is available for adding and deleting users of a running application.
