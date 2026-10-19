# Installation

These are installation instructions for the DTaaS application.
The setup requires a machine with at least 16 GB RAM, 8 vCPUs,
and 50 GB of hard disk space.

DTaaS can be installed in several configurations.
Each configuration serves a different purpose.

| Installation Setup | Purpose |
| :----- | :----- |
| [localhost](dtaas/docker/localhost/README.md) | Install DTaaS on a local computer for a single user; does not need a web server. _This setup does not require domain name._ |
| [Server](dtaas/docker/server/README.md) | Install DTaaS on a server for multiple users over HTTP, with an external GitLab. |
| [Secure server](dtaas/docker/secure-server/README.md) | Install DTaaS on a server for multiple users over HTTPS, with an external GitLab. |
| [Secure server with integrated GitLab](dtaas/docker/secure-server_with_integrated-gitlab/README.md) | Install DTaaS on a server for multiple users over HTTPS, with a GitLab instance included in the package. |
| [Workspace on localhost](workspace/dex/localhost/README.md) | Run the workspace image on a local computer, with Dex for sign-in. |
| [Workspace on secure server](workspace/keycloak/production/README.md) | Run the workspace image on a server over HTTPS, with Keycloak for sign-in. |
| [Vagrant machine](vagrant/README.md) | Install DTaaS on a virtual machine; can be used for single or multiple users. |
