# Runner

A utility service for the safe execution of remote scripts and commands.
The user launches it from the command line, and the utility
manages the commands to be executed.

The runner runs as a service and provides a
REST API for executing remote commands safely.
Several runners can be active at the same time on one computer.
Commands are sent through the REST API and executed on the computer
running the runner.

<!-- markdownlint-disable MD046 -->
<!-- prettier-ignore -->
!!! info
    The runner works on Linux and Windows. On Windows, it runs
    the PowerShell version of each script.
<!-- markdownlint-enable MD046 -->

## :arrow_down: Install

### NPM Registry

The package is available on
[npmjs](https://www.npmjs.com/package/@into-cps-association/runner).

Install the package with the following command:

```bash
sudo npm install -g @into-cps-association/runner
```

### GitHub Registry

The package is available in GitHub
[packages registry](https://github.com/orgs/INTO-CPS-Association/packages).

Set the registry and install the package with the following commands:

```bash
sudo npm config set @into-cps-association:registry \
  https://npm.pkg.github.com
sudo npm install -g @into-cps-association/runner
```

The _npm install_ command asks for a username and password. The username is
your GitHub username and the password is a GitHub
[personal access token](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens).
For npm to download the package, the personal access token
needs the _read:packages_ scope.

## :gear: Configure

The utility needs a configuration file in YAML format.
The template configuration file is:

```yaml
port: 5000
location: 'scripts'  # directory of scripts, relative to this config file
commands:  # list of permitted scripts
  - create
  - execute
  - terminate
```

Name the configuration file _runner.yaml_ and place it in the
directory from which the _runner_ microservice is run.

`location` is the path of the scripts directory relative to the
_runner.yaml_ file.

You can choose any configuration filename and any `location`.
The path to the configuration file can be relative or absolute,
but the `location` path is always relative to the configuration file.

:fontawesome-solid-circle-info:
The commands must be executable. On Linux, make sure the commands
have execute permission.

## :pen: Create Commands

The runner needs commands or scripts to run.
Place them in the `location` directory specified in the
_runner.yaml_ file. The location is relative to
the directory of the _runner.yaml_ file.

On Windows, each command needs a PowerShell script with the `.ps1`
extension, for example _create.ps1_ for the _create_ command.
The runner executes it with
`powershell.exe -NoProfile -ExecutionPolicy Bypass -File`.
A directory can hold both versions of a script, so that the same
commands work on Linux and Windows.

The runner can also run in a docker container. See the
[docker instructions](https://github.com/INTO-CPS-Association/DTaaS/blob/feature/distributed-demo/servers/execution/runner/DOCKER.md).

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

The config option is optional. Without it, **runner** looks for
_runner.yaml_ in the directory from which it is run.
Once launched, the utility listens on the port specified in the
_runner.yaml_ file.

```bash
runner  #use runner.yaml of the present working directory
runner -c FILE-PATH       #absolute or relative path to config file
runner --config FILE-PATH #absolute or relative path to config file
```

On the computer where it runs,
the service is available at `http://localhost:<port>`.

Other computers on the network can reach it at
`http://<ip or hostname>:<port>/`.

### Application Programming Interface (API)

Three REST API methods are available. Their routes and responses
are:

| REST API Route                 | HTTP Method | Return Value                                                            | Comment                                                                                        |
| :----------------------------- | :---------- | :---------------------------------------------------------------------- | :--------------------------------------------------------------------------------------------- |
| localhost:port                 | POST        | Returns the execution status of command                                 | Executes the command provided. Each invocation appends to _array_ of commands executed so far. |
| localhost:port                 | GET         | Returns the execution status of the last command sent via POST request. |                                                                                                |
| localhost:port/history         | GET         | Returns the array of POST requests received so far.                     |                                                                                                |

<!-- markdownlint-disable MD046 -->

#### POST Request to /

Executes a command. The command must be listed under `commands` in
the configuration file and exist in the _location_ directory.
A command that is not permitted, or that fails, gets an HTTP 400 response.

=== "Valid HTTP Request"

    ``` http-request
    POST / HTTP/1.1
    Host: intocps.org
    Content-Type: application/json
    Content-Length: 388

    {
      "name": "<command-name>"
    }
    ```

=== "HTTP Response - Valid Command"

    ``` http-response
    Connection: close
    Content-Length: 134
    Content-Type: application/json; charset=utf-8
    Date: Tue, 09 Apr 2024 08:51:11 GMT
    Etag: W/"86-ja15r8P5HJu72JcROfBTV4sAn2I"
    X-Powered-By: Express

    {
      "status": "success"
    }
    ```

=== "HTTP Response - Invalid Command"

    ``` http-request
    Connection: close
    Content-Length: 28
    Content-Type: application/json; charset=utf-8
    Date: Tue, 09 Apr 2024 08:51:11 GMT
    Etag: W/"86-ja15r8P5HJu72JcROfBTV4sAn2I"
    X-Powered-By: Express

    {
      "status": "invalid command"
    }
    ```

#### GET Request to /

Shows the status of the command last executed.

=== "Valid HTTP Request"

    ``` http-request
    GET / HTTP/1.1
    Host: intocps.org
    Content-Type: application/json
    Content-Length: 388

    {
      "name": "<command-name>"
    }
    ```

=== "HTTP Response - Valid Command"

    ``` http-response
    Connection: close
    Content-Length: 134
    Content-Type: application/json; charset=utf-8
    Date: Tue, 09 Apr 2024 08:51:11 GMT
    Etag: W/"86-ja15r8P5HJu72JcROfBTV4sAn2I"
    X-Powered-By: Express

    {
      "name": "<command-name>",
      "status": "valid",
      "logs": {
        "stdout": "<output log of command>",
        "stderr": "<error log of command>"
      }
    }
    ```

=== "HTTP Response - Invalid Command"

    ``` http-request
    Connection: close
    Content-Length: 70
    Content-Type: application/json; charset=utf-8
    Date: Tue, 09 Apr 2024 08:51:11 GMT
    Etag: W/"86-ja15r8P5HJu72JcROfBTV4sAn2I"
    X-Powered-By: Express

    {
      "name": "<command-name>",
      "status": "invalid",
      "logs": {
        "stdout": "",
        "stderr": ""
      }
    }
    ```

<!-- markdownlint-enable MD046 -->

#### GET Request to /history

Returns the array of POST requests received so far.
Both valid and invalid commands are recorded in the history.

```http
[
  {
    "name": "valid command"
  },
  {
    "name": "valid command"
  },
  {
    "name": "invalid command"
  }
]
```
