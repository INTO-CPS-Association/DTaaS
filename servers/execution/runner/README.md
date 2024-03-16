# :runner: Digital Twin Runner

A utility service to manage the
[lifecycle of one digital twin](../../../docs/user/digital-twins/lifecycle.md).
The lifecycle of a digital twin is made of multiple phases.
This digital twin runner utility
helps with the managing the execution of lifecycle phases.
This utility can be
launched in two scenarios:

1. User launches this from commandline and let the utility
   manage the lifecycle of one digital twin.
1. Execution infrastructure of Digital Twin as a Service (DTaaS)
   launches this utility and instructs it to manage the lifecycle of
   one digital twin.

The digital twin runner utility runs as a service and will provide
REST API interface to execute lifecycle scripts of a digital twin.
One digital twin runner is responsible for execution of a digital twin.

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

## :rocket: Use

```bash
runner # launch the digital twin runner
```

Once launched, the utility runs at `port 3000`.

If launched on one computer,
you can access the same at `http://localhost:3000`.

Access to the service on network is available at `http://<ip or hostname>:3000/`.

Three REST API routes are active. The route paths and the responses given
for these two sources are:

| REST API Route                 | Return Value | Comment |
| :----------------------------- | :----------- | :------ |
| localhost:3000/phase | [ hello ] | Each invocation appends to _array_. |
| localhost:3000/lifecycle/phase | _true_       | Always returns _true_ |
| localhost:3000/phase | [ hello ] | array. |

## :balance_scale: License

This software is owned by
[The INTO-CPS Association](https://into-cps.org/)
and is available under [the INTO-CPS License](./LICENSE.md).
