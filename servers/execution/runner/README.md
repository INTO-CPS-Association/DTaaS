# :runner: Runner

A utility service to manage safe execution of remote scripts / commands.
User launches this from commandline and let the utility
manage the commands to be executed.

The runner utility runs as a service and provides
REST API interface to safely execute remote commands.
Multiple runners can be active simultaneously on one computer.
The commands are sent via the REST API and are executed on the computer
with active runner.

:warning: Thanks for trying out this software.
This software is in early stages of development and is not
recommended for production use. Each released package will have
a working API and matching documentation in this README.
However, there will be breaking changes in the API across each release
until the package reaches version 1.0.0.

:x: This package does not work on Windows OS.

## :arrow_down: Install

### NPM Registry

The package is available on
[npmjs](https://www.npmjs.com/package/@into-cps-association/runner).

Install the package with the following command:

```bash
sudo npm install -g @into-cps-association/runner
```

### Github Registry

The package is available in Github
[packages registry](https://github.com/orgs/INTO-CPS-Association/packages).

Set the registry and install the package with the following commands

```bash
sudo npm config set @into-cps-association:registry https://npm.pkg.github.com
sudo npm install -g @into-cps-association/runner
```

The _npm install_ command asks for username and password. The username is
your Github username and the password is your Github
[personal access token](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens).
In order for the npm to download the package, your personal access token
needs to have _read:packages_ scope.

## :gear: Configure

The utility requires config specified in YAML format.
The template configuration file is:

```ini
port: 5000
location: 'script' #directory location of scripts
commands: #list of permitted scripts
  - create
  - execute
```

It is suggested that the configuration file be named as _runner.yaml_
and placed in the directory in which the _runner_ microservice is run.

The `location` refers to the relative location of the scripts directory
with respect to the location of _runner.yaml_ file.

However, there is no limitation on either the configuration filename or
the `location`. The path to _runner.yaml_ can either be relative or
absolute path. However, the `location` path is always relative path
with respect to the path of _runner.yaml_ file.

:warning: The commands must be executable. Please make sure that
the commands have execute permission on Linux platforms.

## :pen: Create Commands

The runner requires commands / scripts to be run.
These need to be placed in the `location` specified in
_runner.yaml_ file.

For example, the `location` directory might contain
the two scripts: _create_ and _execute_. These two become
valid command names that consumers of REST API can invoke.
All other command execution requests result in invalid status.

## :rocket: Use

Display help.

```bash
$runner -h
Usage: runner [options]

Remote code execution for humans

Options:
  -v --version          package version
  -c --config <string>  runner config file specified in yaml format (default: "runner.yaml")
  -h --help             display help
```

The config option is not mandatory. If it is not used, **runner** looks for
_runner.yaml_ in the directory from which it is being run.
Once launched, the utility runs at the port specified in
_runner.yaml_ file.

```bash
runner  #use runner.yaml of the present working directory
runner -c FILE-PATH       #absolute or relative path to config file
runner --config FILE-PATH #absolute or relative path to config file
```

If launched on one computer,
you can access the same at `http://localhost:<port>`.

Access to the service on network is available at `http://<ip or hostname>:<port>/`.

### Application Programming Interface (API)

Three REST API methods are active. The route paths and the responses given
for these two sources are:

| REST API Route         | HTTP Method | Return Value                                                            | Comment                                                                                                 |
| :--------------------- | :---------- | :---------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------ |
| localhost:port         | POST        | Returns the execution status of command                                 | Executes the command provided. All the commands sent in the right JSON format gets stored in _history_. |
| localhost:port         | GET         | Returns the execution status of the last command sent via POST request. |                                                                                                         |
| localhost:port/history | GET         | Returns the array of valid POST requests received so far.               |                                                                                                         |

#### POST Request to /

Executes a command. The command name given here must exist
in _location_ directory.

```http
{
  "name": "<command name>"
}
```

If the command is in the permitted list of commands specified
in _runner.yaml_ and the matching command / script exists in _location_,
a successful execution takes place. The API response will be

```http
{
  "status": "success"
}
```

If the command is neither permitted nor available, the response will be

```http
{
  "status": "invalid command"
}
```

#### GET Request to /

Shows the status of the command last executed. If the execution
was successful, the status will be

```http
{
  "name": "<command-name>",
  "status": "valid",
  "logs": {
    "stdout": "<output log of command>",
    "stderr": "<error log of command>"
  }
}
```

If the execution is unsuccessful, the status will be

```http
{
  "name": "<command-name>",
  "status": "invalid",
  "logs": {
    "stdout": "",
    "stderr": ""
  }
}
```

If an incorrectly formatted JSON is sent via POST request,
a validation error is returned.

```http
{
  "message": "Validation Failed",
  "error": "Bad Request",
  "statusCode": 400
}
```

#### GET Request to /history

Returns the array of POST requests received so far.
Both valid and invalid commands are recorded in the history.

```http
[
  {
    "name": "valid command"
  },
  {
    "name": "invalid command"
  },
  {
    "name": "valid command"
  }
]
```

## :balance_scale: License

This software is owned by
[The INTO-CPS Association](https://into-cps.org/)
and is available under
[the INTO-CPS License](https://odin.cps.digit.au.dk/into-cps/LICENSE.md).
