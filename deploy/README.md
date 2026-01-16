# Install

These are installation instructions for the DTaaS application.
The setup requires a machine which can spare 16GB
RAM, 8 vCPUs and 50GB Hard Disk space.

The DTaaS can be installed in different ways.
Each version serves a different purpose.

| Installation Setup | Purpose |
| :----- | :----- |
| [localhost](docker/LOCALHOST.md) | Install DTaaS on your computer for a single user; does not need a web server. _This setup does not require domain name._ |
| [Server](docker/SERVER.md) | Install DTaaS on server for multiple users. |
| [One vagrant machine](vagrant/single-machine/README.md) | Install DTaaS on a virtual machine; can be used for single or multiple users. |
| [Two vagrant machines](vagrant/two-machine/README.md) | Install DTaaS on two virtual machines; can be used for single or multiple users. |
|   | The core DTaaS application is installed on the first virtual machine and all the services (RabbitMQ, MQTT, InfluxDB, Grafana and MongoDB) are installed on second virtual machine. |
