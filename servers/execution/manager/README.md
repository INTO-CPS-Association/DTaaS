# Execution Manager

The Execution Manager is the DTaaS microservice that runs digital twins (DTs)
for the users of a DTaaS installation. It is a NestJS service that offers the
digital twin operations of
[dt-automation](https://www.npmjs.com/package/@into-cps-association/dt-automation):
list the digital twins of a GitLab user, read one, start and stop an
execution, and read an execution with the logs of its pipeline jobs. The
service keeps the status of every running execution current by asking GitLab
on a timer, so no client has to poll. This version acts for one GitLab user,
named in the configuration, and offers the operations through a REST API; the
MQTT API follows in the next release.

## Install

The package is private and is not published to a registry. Build it from the
DTaaS source code, branch `feature/distributed-demo`:

```bash
git clone --branch feature/distributed-demo https://github.com/INTO-CPS-Association/DTaaS.git
cd DTaaS/servers/execution/manager
yarn install
yarn build
```

The service does not start without a GitLab URL, username and token, which
the GitLab section below describes. Copy the sample configuration, set
`gitlab.url` and `gitlab.username` in the copy, set the token in the
`EXECUTION_MANAGER_GITLAB_TOKEN` environment variable, and start the service:

```bash
cp config/execution-manager.yaml.sample config/execution-manager.yaml
yarn start --config config/execution-manager.yaml
```

A Docker image can be built from the repository root with
<https://github.com/INTO-CPS-Association/DTaaS/blob/feature/distributed-demo/developer/check/execution-manager.dockerfile>.
The container takes the GitLab settings as environment variables;
`--env EXECUTION_MANAGER_GITLAB_TOKEN` without a value passes the token from
your shell:

```bash
docker build --file developer/check/execution-manager.dockerfile --tag dtaas-execution-manager .
docker run --rm --publish 127.0.0.1:4004:4004 \
  --env EXECUTION_MANAGER_GITLAB_URL=https://gitlab.example.org \
  --env EXECUTION_MANAGER_GITLAB_USERNAME=user1 \
  --env EXECUTION_MANAGER_GITLAB_TOKEN \
  dtaas-execution-manager
```

## Configuration

Settings come from three places, each overriding the one before it: built-in
defaults, a YAML configuration file, and environment variables. The file is
located by the `-c` (or `--config`) option, then by
`EXECUTION_MANAGER_CONFIG_PATH`, and otherwise `execution-manager.yaml` in the
working directory is used if it exists. Without a file, the defaults apply.

```bash
yarn start -- -c ./execution-manager.yaml
```

| Setting        | Default             | Environment variable             |
| :------------- | :------------------ | :------------------------------- |
| `hostname`     | `127.0.0.1`         | `EXECUTION_MANAGER_HOSTNAME`     |
| `port`         | `4004`              | `EXECUTION_MANAGER_PORT`         |
| `route-prefix` | `execution-manager` | `EXECUTION_MANAGER_ROUTE_PREFIX` |

Every route, the health endpoint included, is served under `route-prefix`.
Set it to `/`, in the YAML file or in `EXECUTION_MANAGER_ROUTE_PREFIX`, to serve
the routes at the root.

Set `hostname: 0.0.0.0` when the service runs in a container or behind a
reverse proxy.

### GitLab

The `gitlab` section names the GitLab user whose digital twins the service
manages. The service starts every pipeline as that user, in the user's project
in `group` on `url`. The token is a personal access token with the `api`
scope. The service refuses to start, naming the setting, when `url`,
`username` or `token` is missing. Set the token through the environment rather
than in the file.

| Setting                         | Default         | Environment variable                            |
| :------------------------------ | :-------------- | :---------------------------------------------- |
| `gitlab.url`                    | required        | `EXECUTION_MANAGER_GITLAB_URL`                  |
| `gitlab.username`               | required        | `EXECUTION_MANAGER_GITLAB_USERNAME`             |
| `gitlab.token`                  | required        | `EXECUTION_MANAGER_GITLAB_TOKEN`                |
| `gitlab.group`                  | `DTaaS`         | `EXECUTION_MANAGER_GITLAB_GROUP`                |
| `gitlab.dt-directory`           | `digital_twins` | `EXECUTION_MANAGER_GITLAB_DT_DIRECTORY`         |
| `gitlab.common-library-project` | `common`        | `EXECUTION_MANAGER_GITLAB_COMMON_LIBRARY_PROJECT` |
| `gitlab.branch`                 | `master`        | `EXECUTION_MANAGER_GITLAB_BRANCH`               |
| `gitlab.runner-tag`             | `linux`         | `EXECUTION_MANAGER_GITLAB_RUNNER_TAG`           |

The defaults are the ones dt-automation uses. The execution history is held
in memory, so the service forgets past executions when it restarts; a running
pipeline on GitLab is not affected.

A sample configuration:

```yaml
hostname: 127.0.0.1
port: 4004
route-prefix: execution-manager
gitlab:
  url: https://gitlab.example.org
  username: user1
  # token: set EXECUTION_MANAGER_GITLAB_TOKEN instead
  group: DTaaS
  dt-directory: digital_twins
  common-library-project: common
  branch: master
  runner-tag: linux
```

The same sample can be downloaded:

```bash
curl -o execution-manager.yaml \
  https://raw.githubusercontent.com/INTO-CPS-Association/DTaaS/feature/distributed-demo/servers/execution/manager/config/execution-manager.yaml.sample
```

## API

Every route is served under the route prefix; the paths below assume the
default `execution-manager`.

| Route                                                        | Purpose                                                                        |
| :----------------------------------------------------------- | :----------------------------------------------------------------------------- |
| `GET /execution-manager/health`                              | Returns `{"status": "ok"}` when serving                                        |
| `GET /execution-manager/digital-twins`                       | The user's digital twins: names and short descriptions                        |
| `GET /execution-manager/digital-twins/:name`                 | One digital twin: descriptions and the names of its files                      |
| `POST /execution-manager/digital-twins/:name/executions`     | Starts an execution; optional `runnerTag` and `branch`; `202` with the record  |
| `GET /execution-manager/digital-twins/:name/executions`      | The digital twin's executions, newest first                                    |
| `GET /execution-manager/digital-twins/:name/executions/:id`  | One execution with its status and job logs                                     |
| `POST /execution-manager/digital-twins/:name/executions/:id/stop` | Stops an execution that has not finished; `200` with the record           |

`:name` is the name of the digital twin's directory under the DT directory of
the user's project. A request with an invalid body or name is answered with
`400`, an unknown digital twin or execution with `404`, and a failure that
dt-automation reports from GitLab with `502` and GitLab's reason in `message`.
dt-automation reports no failure while it reads the descriptions and file names
of a digital twin. Such a failure gives `200` with a placeholder description or
empty file lists.

An execution record:

```json
{
  "id": "6f1c2d6e-9d7a-4a2e-9f9d-3f2b1c0a5e71",
  "dtName": "mass-spring-damper",
  "pipelineId": 1234,
  "timestamp": 1760000000000,
  "status": "running",
  "jobLogs": [{ "jobName": "execute", "log": "..." }]
}
```

`status` is one of `running`, `completed`, `failed`, `canceled` and `error`, as
dt-automation reports them. The service sets no time limit on an execution.
dt-automation starts a digital twin through a parent pipeline, which triggers
the digital twin's own pipeline. `jobLogs` holds the logs of the jobs of that
pipeline once it has finished, whether it completed or failed. `jobLogs` stays
empty when the execution is stopped through the service, and when the parent
pipeline fails or is canceled in GitLab. Stopping an
execution that has completed, failed or been canceled changes nothing and
returns its record. An execution in `error` has lost its status check, so
stopping it still cancels its pipeline.

```bash
curl -X POST http://localhost:4004/execution-manager/digital-twins/mass-spring-damper/executions \
  -H 'Content-Type: application/json' \
  -d '{"runnerTag": "linux"}'
curl http://localhost:4004/execution-manager/digital-twins/mass-spring-damper/executions
curl -X POST http://localhost:4004/execution-manager/digital-twins/mass-spring-damper/executions/<id>/stop
```

This version has no authentication: anyone who reaches the port acts as the
configured user. Keep the default bind address `127.0.0.1` unless a reverse
proxy in front of the service authenticates its callers.

## License

This software is owned by [The INTO-CPS Association](https://into-cps.org/)
and is available under
[the INTO-CPS License](https://odin.cps.digit.au.dk/into-cps/LICENSE.md).
