# DTaaS Command Line Interface

This is a command line tool for the
INTO-CPS-Association Digital Twins as a Service.

## Prerequisite

The DTaaS application with base users and essential
containers should be up and running before using the CLI.

## Installation

Simply install using:

We recommend installing this in a virutal environment.

Steps to install:

- Change the working folder:

```bash
cd <DTaaS-directory>/cli
```

- We recommend installing this in a virtual environment.
  Create and activate a virtual environment.

- To install, simply:

```bash
pip install dtaas
```

## Usage

### Setup

The base DTaaS system should be up and
running before adding/deleting users with the CLI.

Additionally,
Setup the _dtaas.toml_ file in the _cli_ directory:

- Set _common.server-dns_ to domain name of your server.
  If you want to bring up the server locally,
  please set this to _"localhost"_.

- Set the _path_ to the full system path
  of the DTaaS directory.

```toml
[common]
# absolute path to the DTaaS application directory
server-dns = "localhost"
path = "/home/Desktop/DTaaS"
```

### Add users

To add new users using the CLI, fill in the
_users.add_ list in
_dtaas.toml_ with the Gitlab instance
usernames of the users to be added

```toml
[users]
# matching user info must present in this config file
add = ["username1","username2", "username3"]
```

Then simply:

```bash
dtaas admin user add
```

#### Caveat

This brings up the containers, without the AuthMS authentication.

- Currently the _email_ fields for each user in
  _dtaas.toml_ are not in use, and are not necessary
  to fill in. These emails must be configured manually
  for each user in the docker/conf.local or
  docker/conf.server files and the _traefik-forward-auth_
  container must be restarted. This is done as follows:

- Go to the _docker_ directory

```bash
cd <DTaaS>/deploy/docker
```

- Add two lines to the `conf.local` file

```txt
rule.onlyu4.action=allow
rule.onlyu4.rule=PathPrefix(`/user4`)
```

- Add three lines to the `conf.server` file

```txt
rule.onlyu3.action=auth
rule.onlyu3.rule=PathPrefix(`/user3`)
rule.onlyu3.whitelist = user3@emailservice.com
```

Run the appropritate command for a server/local installation:

```bash
docker compose -f compose.server.yml --env-file .env up -d --force-recreate traefik-forward-auth
```

```bash
docker compose -f compose.local.yml --env-file .env up -d --force-recreate traefik-forward-auth
```

The new users are now added to the DTaaS
instance, with authorization enabled.

### Delete users

TO delete existing users, fill in the _users.delete_ list in
_dtaas_.toml_ with the Gitlab instance
usernames of the users to be deleted.

Make sure you are in the _cli_ directory.

Then simply:

```bash
dtaas admin user delete
```

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
