# Signals Gateway Microservice

The signals gateway will serve the live and past signals of digital twins
to the DTaaS client, so that no broker or PostgreSQL credential reaches the
browser.

The routes keep their final paths. Each one except health signs the user in
and decides access first:

| Route | Answer now |
| :--- | :--- |
| `GET /signals/health` | `200` with `{"status":"ok"}` |
| `POST /signals/stream` | `401` without a valid token, `403` when no path is readable, else live samples as server-sent events |
| `GET /signals/stats` | What the user's ended streams forwarded and dropped |
| `POST /signals/command` | `401` without a valid token, `400` for a path that takes no command, `403` without write access or a `setpoint` declaration, else `202` once the broker has the command |
| `POST /signals/range` | `401` without a valid token, `403` when no path is readable, else past samples as JSON, `502` when the database fails |

A token is either a GitLab token or a JWT of a Keycloak realm or Dex
instance named in `oidc-providers`. GitLab is asked about a GitLab token
with `/oauth/token/info`, and the token must belong to an application in
`gitlab-client-id` and carry a scope of `gitlab-scopes`. The token is
never logged, written to disk or sent anywhere but `gitlab-url`. A project
is readable with the Reporter role at least, since every signed-in user
can read a project with internal visibility. A path is readable when a
twin in a readable project of the DTaaS group declares it in its committed
`visualisation.json` and the topic starts with a prefix of the owner's
group in `owners-file`, which `dtaas-services` writes. Every decision is
logged without the token. Live samples come from RabbitMQ over MQTT, on
one connection of the service account `dtaas_signals`. A message outside
the payload convention (`value`, `ts` and `unit`) is dropped and counted.
Past samples come from the `reading` table of the database of the owner's
group, which Telegraf writes, read as `dtaas_signals_ro`. A topic of eight
levels names its series by device and quantity. A range with more points
than `range-max-points` is averaged in `date_bin` bins.

A command goes to `<device topic>/cmd/<command>` with the payload of the
convention. It needs a twin that declares the actuator topic on the
`setpoint` channel and write access to its project: Developer in GitLab
(`gitlab-min-write-level`), or `<owner>_member` or `<owner>_admin` from
Keycloak, or a role from the GitLab connector of Dex. Commands go on a
second MQTT connection, since RabbitMQ closes a connection that publishes
where it may not. A command the broker does not take within
`command-timeout` answers `504`.

Each live sample carries the time the gateway received it as its event id,
and a stream that reaches `stream-max-age` sends an `end` event before it
closes. A client that opens the stream again with `Last-Event-ID` first gets
the readings of the gap from the history, marked `backfill`, then the live
ones. A gap the history cannot fill is reported in a `gap` event.

## Configuration

The service reads the YAML file named by the `SIGNALS_CONFIG_PATH`
environment variable, or `signals.yaml` in the working directory when that
variable is not set. Every key can also be set with an environment
variable: `SIGNALS_` and the key in upper case with `_` for `-`, for
example `SIGNALS_PORT`. Environment variables override the file.

Save this as `signals.yaml` and adjust it. It lists every key with its
default value, except `gitlab-url`, `gitlab-client-id`, `owners-file`,
`mqtt-password-file` and `postgres-password-file`, which have no default
and show an example:

```yaml
# Where the service listens.
hostname: 127.0.0.1
port: 4004

# Off by default: behind Traefik the client is served from the same origin.
# Set an origin only when the client runs elsewhere.
cors-allow-origin: ''
cors-allow-credentials: false

# Largest JSON request body, in bytes.
max-payload-bytes: 65536
# Requests per TCP peer per window (milliseconds). Behind a reverse proxy
# this is a budget shared by every user.
throttle-ttl: 60000
throttle-limit: 120
# Addresses or CIDR ranges of the reverse proxies in front of the gateway,
# such as Traefik. The client address is then taken from X-Forwarded-For as
# the proxy appended it, so the limit counts each client. Empty trusts none.
# The gateway warns at startup when forwarded-user-header is set and this
# list is empty, since every user then shares one limit.
trusted-proxies: []

# The one GitLab that validates tokens and answers what a user may read.
# The user's token is sent to this host and to no other.
gitlab-url: https://foo.com/gitlab
# The group whose projects hold the users' twins, one project per user.
gitlab-group: DTaaS
# The branch whose committed visualisation.json files declare the signals.
gitlab-branch: master
# Lowest GitLab access level that counts as reading a project (20 = Reporter).
# Lower values are refused, since every signed-in user can read a project
# with internal visibility.
gitlab-min-access-level: 20
# Lowest GitLab access level that may send data to a twin (30 = Developer).
gitlab-min-write-level: 30
# Timeout of one GitLab call, in milliseconds.
gitlab-timeout: 5000
# When set, the request must carry this header with the email of the token's
# user, as traefik-forward-auth sets it. Leave empty to skip the check.
forwarded-user-header: ''
# Only tokens GitLab issued to these OAuth applications are accepted: the
# gateway's own application, and the DTaaS client's (REACT_APP_CLIENT_ID in
# client.js) while the client still sends its own token. Until the
# placeholders are replaced every token is refused. Left empty, the gateway
# refuses to start. As a variable: a comma-separated list.
gitlab-client-id:
  - '<SIGNALS_GATEWAY_APPLICATION_ID>'
  - '<DTAAS_CLIENT_APPLICATION_ID>'
# A GitLab token must carry one of these scopes. The token is never logged,
# written to disk or sent anywhere but gitlab-url.
gitlab-scopes: [read_api, api]
# Lets the gateway start with an empty gitlab-client-id, so any OAuth
# application's token is accepted. Only for a local development stack.
allow-any-gitlab-client: false
# Keycloak realms or Dex instances whose JWTs are accepted, besides GitLab
# tokens. Each JWT must name the issuer, carry the audience and be signed by
# a key of jwks-url. Its groups name the projects the user may read:
# '<owner>_viewer', '<owner>_member' or '<owner>_admin' from Keycloak, or
# '<gitlab-group>/<owner>:developer' from the GitLab connector of Dex.
oidc-providers: []
#  - issuer: https://foo.com/auth/realms/dtaas
#    audience: dtaas-signals
#    jwks-url: https://foo.com/auth/realms/dtaas/protocol/openid-connect/certs
#    groups-claim: groups
# File with a GitLab token that has the read_api scope only, used to read the
# twins of a user signed in through Keycloak or Dex. It can read every
# project its user can, so that user should be a Reporter of the DTaaS group
# and nothing more. Mode 600, nothing else in it. The gateway warns at start
# when the token has a scope beyond read_api.
gitlab-token-file: ''
# How long an identity and a user's project list are cached (milliseconds).
identity-cache-ttl: 60000
projects-cache-ttl: 60000
# How long the signals read from one project's committed twins are kept
# (milliseconds). A new commit on gitlab-branch replaces them sooner.
twin-index-cache-ttl: 600000
# How long the commit of gitlab-branch is kept for one user and project
# (milliseconds). A new commit is seen this much later at most.
branch-cache-ttl: 5000
# The folder of each project that holds one folder per twin.
twins-folder: digital_twins
# JSON file mapping each owner (the project path in gitlab-group) to its
# group and the topic prefixes of that group, written by dtaas-services with
# the broker accounts and the database: {"jady": {"group": "swim",
# "topics": ["SWiM/"]}}. A twin's topic outside its owner's prefixes is not
# served. Without the file no topic is served.
owners-file: /run/secrets/signals_owners.json
# The channel of a topic whose mqtt transport names none.
default-channel: measured

# RabbitMQ over MQTT, with the service account of the gateway. mqtts://
# verifies the broker certificate. No user name or password in the URL.
mqtt-url: mqtt://localhost:1883
mqtt-user: dtaas_signals
# File holding the account's password, and nothing else. Mode 600.
mqtt-password-file: /run/secrets/rabbitmq_dtaas_signals_password
# Timeout of one connection attempt, in milliseconds.
mqtt-connect-timeout: 10000
# How long a command may wait for the broker to take it, in milliseconds.
command-timeout: 10000

# Limits of one request and one user.
max-paths-per-stream: 200
max-path-length: 256
max-streams-per-user: 4
# Broker messages larger than this many bytes are dropped. So is a message
# outside the payload convention: a number value, an RFC 3339 ts and a unit.
max-message-bytes: 65536
# Bytes a stream may hold unsent while the client reads slower than samples
# arrive. Past this, new samples are dropped and counted as congested.
max-backlog-bytes: 1048576
# A stream closes after this many milliseconds, or when the token expires.
stream-max-age: 600000
# Milliseconds between two checks that the user may still read every signal
# of an open stream. A revoked signal ends the stream. The check reads the
# project list cached for projects-cache-ttl, so a revocation takes effect
# within this interval plus projects-cache-ttl.
stream-recheck-interval: 60000
# Milliseconds between ': keep-alive' comments on a stream.
keep-alive-interval: 15000
# The reconnect wait sent to the client as 'retry:', in milliseconds.
retry-interval: 5000
# PostgreSQL, read for the history of a signal as the read-only account.
# The URL names only the host and port. Each group has its own database,
# named by the template filled with the owner of the twin.
postgres-url: postgres://localhost:5432
postgres-user: dtaas_signals_ro
# File holding the account's password, and nothing else. Mode 600.
postgres-password-file: /run/secrets/postgresql_dtaas_signals_ro_password
postgres-database-template: '{group}'
# Verify the server certificate over TLS. Turn on outside the Docker network.
postgres-tls: false
# Timeout of one connection and one query, in milliseconds.
postgres-timeout: 10000

# Longest history range (milliseconds) and most points in one answer. A
# longer series is averaged in date_bin bins.
range-max-span: 604800000
range-max-points: 10000
# A stream opened again with Last-Event-ID is first filled from the history,
# from that time less the lookback, in milliseconds. A longer gap than
# resume-max-gap is filled only for its last resume-max-gap milliseconds.
resume-lookback: 5000
resume-max-gap: 600000
```

Set `hostname: 0.0.0.0` when the service runs in a container or behind a
reverse proxy.
