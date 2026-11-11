# Signals Gateway Configuration

The **signals gateway microservice** serves the live and past signals of
digital twins to the DTaaS client at `/signals`. It signs each user in, serves
only the signals that the twins of the user's GitLab projects declare and
reads RabbitMQ and PostgreSQL with service accounts kept on the server.

## The Configuration File

The gateway reads the file named by `SIGNALS_CONFIG_PATH`, or `signals.yaml`
in its working directory, `/dtaas/signals` in the Docker image. The
[sample configuration](https://github.com/INTO-CPS-Association/DTaaS/blob/feature/distributed-demo/servers/signals/config/signals.yaml.sample)
documents every key and the gateway refuses a key it does not know. Each key
can also be set with an environment variable: `SIGNALS_` and the key in upper
case with `_` for `-`, for example `SIGNALS_GITLAB_URL` for `gitlab-url`. An
environment variable takes precedence over the file. Each DTaaS Docker
package carries `config/signals.yaml.example` with the keys below.

## Sign-In

| Key | What it does |
| :-- | :----------- |
| `gitlab-url` | The GitLab that validates tokens and answers what a user may read. The user's token is sent to this host and to no other |
| `gitlab-group` | The group whose projects hold the users' twins, `DTaaS` by default |
| `gitlab-branch` | The branch whose committed `visualisation.json` files declare the signals, `master` by default |
| `gitlab-client-id` | The Application ID of the DTaaS client OAuth application, `REACT_APP_CLIENT_ID` in `client.js`. A GitLab token issued to another OAuth application is refused. Left empty, the gateway refuses to start |
| `allow-any-gitlab-client` | `false` by default. `true` lets the gateway start with an empty `gitlab-client-id` and accept any OAuth application's token. Only for a local development stack |
| `gitlab-min-access-level` | Lowest GitLab access level that reads a project, `20` (Reporter) by default |
| `gitlab-min-write-level` | Lowest GitLab access level that may send data to a twin, `30` (Developer) by default |
| `forwarded-user-header` | A header that must carry the e-mail of the token's user, `x-forwarded-user` behind traefik-forward-auth. Empty skips the check |

### Keycloak and Dex

`oidc-providers` lists the Keycloak realms or Dex instances whose JWTs the
gateway accepts besides GitLab tokens:

```yaml
oidc-providers:
  - issuer: https://foo.com/auth/realms/dtaas
    audience: dtaas-signals
    jwks-url: https://foo.com/auth/realms/dtaas/protocol/openid-connect/certs
    groups-claim: groups
    groups-format: access-plan
```

A JWT must name the issuer, carry the audience, be unexpired and be signed
with RS256 or ES256 by a key of `jwks-url`. Its groups name the projects the
user reads. With `groups-format: access-plan`, the default for Keycloak, the
groups are `<owner>_viewer`, `<owner>_member` and `<owner>_admin`, and
`viewer` only reads. With `dex-gitlab`, for the GitLab connector of Dex, the
groups are `<gitlab-group>/<owner>:developer`, `:maintainer` or `:owner` and
each one may also write. A Keycloak or Dex token cannot be sent to GitLab, so
the gateway reads the twins of these users with its own GitLab token, a token
with `read_api` in the file that `gitlab-token-file` names. Without that file
these users read nothing.

## Twins and Owners

| Key | What it does |
| :-- | :----------- |
| `twins-folder` | The folder of each project that holds one folder per twin, `digital_twins` by default |
| `owners-file` | The JSON file that maps each owner to its group and topic prefixes, written by `dtaas-services user add-history --owner`. Without it no topic is served |
| `default-channel` | The channel of a topic whose `mqtt` transport names none, `measured` by default |

A path is served when a twin in a project the user can read declares it in
the `topics` of an `mqtt` transport of its committed
`<twins-folder>/<twin>/visualisation.json` and the topic starts with a prefix
of the owner's group in `owners-file`. A path of the history must have the
eight levels of the naming convention. Every decision is logged with the
user, the paths and the result, never with the token.

The owner's group is the boundary of trust, not the twin or the project. A
user who may write to one project of a group can declare in a twin any topic
under the prefixes of that group, then stream it, read its history and, on the
`setpoint` channel, send commands to it. Put owners who should not reach each
other's devices in different groups.

## Live Signals Over MQTT

| Key | What it does |
| :-- | :----------- |
| `mqtt-url` | The MQTT listener of RabbitMQ, `mqtts://` with TLS. No user name or password in the URL |
| `mqtt-user` | The gateway's account, `dtaas_signals` by default |
| `mqtt-password-file` | The file that holds the password of that account |
| `mqtt-connect-timeout` | Timeout of one connection attempt in milliseconds |
| `command-timeout` | How long a command may wait for the broker to take it, in milliseconds |

The gateway subscribes in the vhost `/`, where RabbitMQ sends all MQTT
traffic, with one connection for samples and one for commands. Over
`mqtts://` it verifies the broker certificate against the host of the URL. A
message outside the payload convention (`value`, `ts` and `unit`) or larger
than `max-message-bytes` is dropped and counted in `GET /signals/stats`.

## History From PostgreSQL

| Key | What it does |
| :-- | :----------- |
| `postgres-url` | Host and port of PostgreSQL, with no user, password or database |
| `postgres-user` | The read-only account, `dtaas_signals_ro` by default |
| `postgres-password-file` | The file that holds the password of that account |
| `postgres-database-template` | The database of a group, `{group}` by default. It must contain `{group}` |
| `postgres-tls` | `true` connects with TLS and verifies the server certificate. Turn it on outside the Docker network |
| `postgres-timeout` | Timeout of one connection and one query in milliseconds |
| `range-max-span` | Longest range of one request, seven days by default |
| `range-max-points` | Most points in one answer, `10000` by default. A longer series is averaged in `date_bin` bins |

The gateway reads the history of a signal from the database of the group that
owns the twin declaring it.

## Behind Traefik

| Key | What it does |
| :-- | :----------- |
| `hostname`, `port` | Where the service listens. The Docker image sets `SIGNALS_HOSTNAME=0.0.0.0` and the port is `4004` |
| `trusted-proxies` | Addresses or CIDR ranges of the reverse proxies in front of the gateway. Empty trusts none |
| `throttle-ttl`, `throttle-limit` | Requests per client in a window of milliseconds |
| `cors-allow-origin`, `cors-allow-credentials` | Off by default, since Traefik serves the client and the gateway from one origin |

Behind Traefik every request comes from the proxy. With `trusted-proxies` set
to the subnet of the Docker network that Traefik and the gateway share, the
client address is taken from `X-Forwarded-For` as the proxy appended it and
the rate limit counts each client. `docker network inspect dtaas-frontend`
prints the subnet of the network of the server packages.

The other keys set the limits of a request and of a user, such as
`max-streams-per-user`, `max-backlog-bytes`, `stream-max-age` and
`stream-recheck-interval`. Their defaults suit most deployments and the sample
describes each one.

## Secrets

Secrets are read only from files: `mqtt-password-file`,
`postgres-password-file`, `gitlab-token-file` and `owners-file`. Each password
file holds the secret and nothing else, with mode 600. A user name or password
inside `mqtt-url` or `postgres-url` is refused at startup. The gateway reads
the files when it needs them and not at startup, so a rotated password is
used at the next connection without a restart and the health route works on a
host that holds no secret. In the DTaaS packages, Docker Compose mounts the
files under `/run/secrets/`, as [Docker](docker.md) shows. The service accounts behind
the passwords are described in [Service Accounts](service-users.md).

## The Client

Set `REACT_APP_VIZ_SIGNALS_URL` in the client's `env.js`, `config/client.js`
in the packages, to the `/signals` address of the server.
