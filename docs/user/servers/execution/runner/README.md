# :runner: Runner

A utility service to manage safe execution of remote commands.
User launches this from commandline and let the utility
manage the commands to be executed.

The runner utility runs as a service and provides
REST API interface to safely execute remote commands.
Multiple runners can be active simultaneously on one computer.
The commands are sent via the REST API and are executed on the computer
with active runner.

## :arrow_down: Install

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

The microservices requires config specified in YAML format.
The template configuration file is:

```ini
port: 5000
location: "lifecycle" #directory location of scripts
```

The file should be named as _runner.yaml_ and placed in the directory
in which the _runner_ microservice is run.

## :pen: Create Commands

The runner requires commands / scripts to be run.
These need to be placed in the `location` specified in
_runner.yaml_ file. The location must be relative to
the directory in which the **runner** microservice is being
run.

## :rocket: Use

```bash
runner # launch the digital twin runner
```

Once launched, the utility runs at the port specified in
_runner.yaml_ file.

If launched on one computer,
you can access the same at `http://localhost:<port>`.

Access to the service on network is available at `http://<ip or hostname>:<port>/`.

### Application Programming Interface (API)

Three REST API methods are active. The route paths and the responses given
for these two sources are:

| REST API Route                 | HTTP Method | Return Value | Comment |
| :----------------------------- |:--------|:----------- | :------ |
| localhost:port | POST  | Returns the execution status of command | Executes the command provided. Each invocation appends to _array_ of commands executed so far. |
| localhost:port | GET |  Returns the execution status of the last command sent via POST request. |  |
| localhost:port/history | GET | Returns the array of POST requests received so far. |  |

#### POST Request to /

Executes a command. The command name given here must exist
in _location_ directory.

=== "Valid HTTP Request"

    ``` http-request
    POST / HTTP/1.1
    Host: foo.com
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

=== "HTTP Response - Inalid Command"

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
    Host: foo.com
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

=== "HTTP Response - Inalid Command"

    ``` http-request
    Connection: close
    Content-Length: 70
    Content-Type: application/json; charset=utf-8
    Date: Tue, 09 Apr 2024 08:51:11 GMT
    Etag: W/"86-ja15r8P5HJu72JcROfBTV4sAn2I"
    X-Powered-By: Express

    {
      "name": "<command-name",
      "status": "invalid",
      "logs": {
        "stdout": "",
        "stderr": ""
      }
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
    "name": "valid command"
  },
  {
    "name": "invalid command"
  }
]
```
