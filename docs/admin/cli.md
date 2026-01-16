# DTaaS Command Line Interface

The DTaaS Command Line Interface (CLI) is a command line tool for managing
a DTaaS installation.

## Prerequisite

The DTaaS platform with base users and essential
containers must be operational before the CLI can be utilized.

## Installation

The CLI is available as a Python package that can be installed via pip.

It is recommended to install the CLI in a virtual environment.

The installation steps are as follows:

- Change the working folder:

```bash
cd <DTaaS-directory>/cli
```

- It is recommended to use a virtual environment.
  A virtual environment should be created and activated.

- To install the CLI:

```bash
pip install dtaas
```

## Usage

!!! note
    The base DTaaS platform should be up and running before
    adding/deleting users with the CLI.

### Configure

The CLI uses _dtaas.toml_ as configuration file. A sample
configuration file is given here.

```toml
# This is the config for DTaaS CLI

name = "Digital Twin as a Service (DTaaS)"
version = "0.2.1"
owner = "The INTO-CPS-Association"
git-repo = "https://github.com/into-cps-association/DTaaS.git"

[common]
# Server hostname either localhost or a valid hostname, ex: foo.com
server-dns = "localhost"
# absolute path to the DTaaS application directory
# Specify the directory of DTaaS installation
# Linux example
path = "/Users/username/DTaaS"
# Windows example
#path = "C:\\Users\\XXX\\DTaaS"
# Note: You have to either use / or \\ when specifying path, else you would get 
# "Error while getting toml file: dtaas.toml, Invalid unicode value"

[common.resources]
# Default resource limits applied when creating user workspace containers.
# Keys:
# - cpus: integer count of virtual CPUs to allocate to the container
# - mem_limit: memory limit string accepted by Docker (e.g. "4G", "512M")
# - pids_limit: maximum number of processes the container may create
# - shm_size: size for /dev/shm (shared memory), e.g. "512m"
#
# Adjust these values to match your host capacity and tenancy policy.
cpus = 4
mem_limit = "4G"
pids_limit = 4960
shm_size = "512m"

# Example: Increase memory and lower CPU for heavier-memory workloads
# cpus = 2
# mem_limit = "8G"


[users]
# matching user info must present in this config file
add = ["username1","username2", "username3"] 
delete = ["username2", "username3"]
...
```

#### Notes

- Edits to `dtaas.toml` affect new user containers created after the change.
- To apply updated limits to existing containers, recreate or restart
  the user container(s) (for example by removing and re-adding the user
  workspace via the CLI or by restarting the container in Docker Compose).
- Use units (`M`, `G`) for memory and shared memory values.

### Select Template

The _cli_ uses YAML templates provided in this directory to create
new user workspaces. The available templates are:

1. _user.local.yml_: localhost installation
1. _User.server.yml_: multi-user web application over HTTP
1. _user.server.secure.yml_: multi-user web application over HTTPS

It should be noted that the _cli_ is not capable of detecting the difference between
HTTP and HTTPS modes of the web application. When serving
the web application over HTTPS, an additional step is required.

```bash
cp user.server.secure.yml user.server.yml
```

This will change the user template from insecure to secure.

### Add Users

To add new users using the CLI, the
_users.add_ list in
_dtaas.toml_ should be populated with the GitLab instance
usernames of the users to be added.

```toml
[users]
# matching user info must present in this config file
add = ["username1","username2", "username3"]
```

The working directory must be the _cli_ directory.

Then execute:

```bash
dtaas admin user add
```

The command checks for the existence of `files/<username>` directory.
If it does not exist, a new directory with correct file structure is created.
The directory, if it exists, must be owned by the user executing
**dtaas** command on the host operating system. If the files do not
have the expected ownership rights, the command fails.

#### Caveats

This process brings up the containers, without the AuthMS authentication.

- Currently the _email_ fields for each user in
  _dtaas.toml_ are not in use, and are not necessary
  to complete. These emails must be configured manually
  for each user in the
  deploy/docker/conf.server files and the _traefik-forward-auth_
  container must be restarted. This is accomplished as follows:

- Navigate to the _docker_ directory

```bash
cd <DTaaS>/deploy/docker
```

- Add three lines to the `conf.server` file

```txt
rule.onlyu3.action=auth
rule.onlyu3.rule=PathPrefix(`/user3`)
rule.onlyu3.whitelist = user3@emailservice.com
```

- Run the command for these changes to take effect:

```bash
docker compose -f compose.server.yml --env-file .env up \
  -d --force-recreate traefik-forward-auth
```

The new users are now added to the DTaaS
instance, with authorization enabled.

### Delete Users

- To delete existing users, the _users.delete_ list in
  _dtaas.toml_ should be populated with the GitLab instance
  usernames of the users to be deleted.

```toml
[users]
# matching user info must present in this config file
delete = ["username1","username2", "username3"]
```

- The working directory must be the _cli_ directory.

Then execute:

```bash
dtaas admin user delete
```

- Remember to remove the rules for deleted users
  in _conf.server_.

### Additional Points to Remember

- The _user add_ CLI will add and start a
  container for a new user.
  It can also start a container for an existing
  user if that container was somehow stopped.
  It shows a _Running_ status for existing user
  containers that are already up and running,
  it doesn't restart them.

- _user add_ and _user delete_ CLIs return an
  error if the _add_ and _delete_ lists in
  _dtaas.toml_ are empty, respectively.

- '.' is a special character. Currently, usernames which have
  '.'s in them cannot be added properly through the CLI.
  This is an active issue that will be resolved in future releases.
