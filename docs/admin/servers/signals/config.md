# Signals Gateway Configuration

The **signals gateway microservice** serves the live and past signals of
digital twins to the DTaaS client at `/signals`. It reads RabbitMQ and
InfluxDB with read-only service credentials kept on the server, and it serves
a user only the signals that the twins of that user declare. The browser holds
no broker or InfluxDB credential.

## The Configuration File

The gateway reads `signals.yaml` from its working directory, the file named by
`--config`, or the file named by `SIGNALS_CONFIG_PATH`. The
[sample configuration](https://github.com/INTO-CPS-Association/DTaaS/blob/feature/distributed-demo/servers/signals/config/signals.yaml.sample)
documents every key, and the gateway refuses a key it does not know. Each key
can also be set with an environment variable: `SIGNALS_` and the key in upper
case with `_` for `-`, for example `SIGNALS_GITLAB_URL` for `gitlab-url`. An
environment variable takes precedence over the file.

The keys a deployment sets are:

| Key | What it does |
| :--- | :--- |
| `gitlab-url` | The GitLab that signs users in. The gateway sends the user's token to this address and to no other |
| `gitlab-group` | The group whose projects hold the users' twins, `DTaaS` by default |
| `gitlab-branch` | The branch whose committed `visualisation.json` files declare the signals, `master` by default |
| `gitlab-client-id` | The Application ID of the DTaaS client, `REACT_APP_CLIENT_ID` in `client.js`. When set, a token GitLab issued to another OAuth application is refused |
| `forwarded-user-header` | A header that must carry the e-mail of the token's user, such as `x-forwarded-user` behind traefik-forward-auth. Empty skips the check |
| `rabbitmq-url` | The broker, `amqp://` or `amqps://`, with no credentials in the address |
| `rabbitmq-user` | The read-only service user, `dtaas-signals` by default |
| `rabbitmq-password-file` | The file that holds the password of that user |
| `vhost-template` | The vhost of a twin's owner, `{owner}` by default, since the DTaaS services CLI creates one vhost for each user. It must contain `{owner}` |
| `influx-url` | InfluxDB 2, for the history of a signal |
| `influx-tokens-file` | The JSON file that maps each InfluxDB org to a read-only token |
| `influx-org-template`, `influx-bucket-template` | The org and bucket a twin may name, `{owner}` by default. Both must contain `{owner}` |

The other keys set the limits of a request and of a user, such as
`max-streams-per-user` and `range-max-span`, and their defaults suit most
deployments. `cors-allow-origin` stays empty when Traefik serves the gateway
and the client from the same origin.

## Secrets

Secrets are read only from files. `rabbitmq-password-file` holds the RabbitMQ
password and nothing else. `influx-tokens-file` holds one entry for each org:

```json
{ "alice": "<read-only token of alice>" }
```

A plain `rabbitmq-password` or `influx-token` key, the matching `SIGNALS_*`
variable, and credentials inside `rabbitmq-url` are refused at startup. The
gateway reads the files when it needs them and not at startup, so a rotated
password or token takes effect without a restart.
[Service Users](service-users.md) describes how to create the user and the
tokens.

## How the Gateway Decides

The client sends the user's GitLab access token as a bearer token. The gateway
asks `gitlab-url` who the token belongs to and when it expires, lists the
projects of `gitlab-group` that the user can read, and reads the committed
`digital_twins/*/visualisation.json` files of each project. A requested signal
is served only when one of those twins declares its topic. Every other path is
refused, and any error while deciding refuses every path. The
[README of the service](https://github.com/INTO-CPS-Association/DTaaS/blob/feature/distributed-demo/servers/signals/README.md)
describes the API and its status codes.

## The Client

Set `REACT_APP_VIZ_SIGNALS_URL` in the client's `env.js` to the `/signals`
address of the server, as the [client configuration](../../client/config.md)
describes. The [Docker page](docker.md) shows how the DTaaS packages run the
gateway behind Traefik.
