# Execution Manager

The Execution Manager is the DTaaS microservice that runs digital twins (DTs)
for the users of a DTaaS installation. It is a NestJS service. This version
serves a health endpoint; the operations on digital twins and their executions
are added in the following releases.

## Install

The package is private and is not published to a registry. Run it from the
DTaaS source code, branch `feature/distributed-demo`:

```bash
git clone --branch feature/distributed-demo https://github.com/INTO-CPS-Association/DTaaS.git
cd DTaaS/servers/execution/manager
yarn install
yarn build
yarn start
```

A Docker image can be built from the repository root with
<https://github.com/INTO-CPS-Association/DTaaS/blob/feature/distributed-demo/developer/check/execution-manager.dockerfile>:

```bash
docker build --file developer/check/execution-manager.dockerfile --tag dtaas-execution-manager .
docker run --rm --publish 127.0.0.1:4004:4004 dtaas-execution-manager
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

A sample configuration:

```yaml
hostname: 127.0.0.1
port: 4004
route-prefix: execution-manager
```

The same sample can be downloaded:

```bash
curl -o execution-manager.yaml \
  https://raw.githubusercontent.com/INTO-CPS-Association/DTaaS/feature/distributed-demo/servers/execution/manager/config/execution-manager.yaml.sample
```

## API

| Route                         | Purpose                                 |
| :---------------------------- | :-------------------------------------- |
| `GET /<route-prefix>/health`  | Returns `{"status": "ok"}` when serving |

With the default prefix:

```bash
curl http://localhost:4004/execution-manager/health
```

## License

This software is owned by [The INTO-CPS Association](https://into-cps.org/)
and is available under
[the INTO-CPS License](https://odin.cps.digit.au.dk/into-cps/LICENSE.md).
