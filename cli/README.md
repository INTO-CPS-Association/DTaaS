# DTaaS Command Line Interface

This is a command line tool for the INTO-CPS-Association Digital Twins as a Service. 

## Prerequisite

Please visit and download the [DTaaS Tool](https://github.com/INTO-CPS-Association/DTaaS). 

The DTaaS service with base users and essential containers should be up and running before using the CLI.


## Installation

Simply install using:

We recommend installing this in a virutal environment.

Steps to install:

- Change the working folder:

```bash
cd <DTaaS-directory>/cli
```

- Recommended (for windows) to install this in a virtual environment

```bash
python -m venv env
env\Scripts\activate
```

- To install, simply:

```bash
pip install dtaas-cli
```

## Usage

### Setup

Setup the _dtaas.toml_ file in the _cli_ directory,
edit the fields appropriately.

### Add users

To add new users using the CLI, fill in the _users.add_ list in
_dtaas.toml_ with the Gitlab instance usernames of the users to be added

Then simply:

```bash
dtaas admin user add
```

### Delete users

TO delete existing users, fill in the _users.delete_ list in
_dtaas_.toml_ with the Gitlab instance usernames of the users to be deleted.

Then simply:

```bash
dtaas admin user delete
```
