# Signals Gateway Microservice

The signals gateway serves live and past signals of digital twins to the
DTaaS client, so the browser holds no broker or InfluxDB credential. The
gateway reads RabbitMQ and InfluxDB with read-only service credentials kept on
the server, and serves a user only the signals of twins that the user can read
in GitLab. This follows the Backend-for-Frontend principle of RFC 10017 for
the platform credentials.

## How It Decides

1. The client sends the user's GitLab OAuth access token as a bearer token.
   The gateway sends it only to the configured `gitlab-url`, asks
   `/oauth/token/info` for its expiry and `/api/v4/user` for the user, and
   caches the answer for 60 s under the SHA-256 of the token. With
   `gitlab-client-id` set, a token issued to another OAuth application is
   refused.
1. With the user's own token, the gateway lists the projects of the
   `gitlab-group` group that the user can read. In DTaaS the twins of user
   `alice` live in the project `DTaaS/alice` under `digital_twins/<twin>`.
1. For each project, the gateway reads the commit of `gitlab-branch`. When the
   commit changed, it reads the committed `digital_twins/*/visualisation.json`
   files again. Their `mqtt` transports list the topics, with an optional
   `channel`, and their `influx` transport names the history.
1. A requested path is allowed only when it is a topic one of those twins
   declares. Everything else is refused, and any error while deciding refuses
   every path. Each decision is logged with the user, the action, the path and
   the outcome, never with a token.

The decision sits behind a small interface, `AccessPolicy` in
`src/authz/policy.ts`, with `check(subject, action, resource)` and
`listResources(subject, action)`, so another policy engine can replace the
GitLab one.

## API

All routes are under `/signals`. The default port is `4004`.

| Route | Answer |
| :--- | :--- |
| `GET /signals/health` | `{"status":"ok"}`, with no other detail |
| `POST /signals/stream` | Live samples as server-sent events |
| `POST /signals/range` | Past samples as JSON |

`stream` and `range` need the header `Authorization: Bearer <token>`.

### Stream

The body is `{"paths": ["alice/pump/flow", ...]}`. The answer is
`text/event-stream`:

```text
retry: 5000

event: state
data: {"state":"connecting"}

event: refused
data: {"paths":["bob/secret"]}

event: state
data: {"state":"live"}

event: sample
data: {"path":"alice/pump/flow","channel":"measured","receivedAt":1760000000000,"payload":"{\"value\":3}"}

: keep-alive
```

- `payload` is the raw text of the broker message. The client decodes it.
- `refused` lists the paths that are not served, once, with no reason.
- `state` turns `down` when the broker connection is lost, and the stream
  ends. The client opens a new one after the `retry` wait.
- A `: keep-alive` comment comes every 15 s.
- The stream ends after `stream-max-age` (10 min) or when the token expires,
  whichever comes first.

### Range

The body is `{"paths": [...], "channel": "measured", "from": 0, "to": 0}`,
with `from` and `to` in epoch milliseconds. The answer is:

```json
{
  "samples": [
    {
      "path": "alice/pump/flow",
      "channel": "measured",
      "ts": 1760000000000,
      "value": 3,
      "quality": null
    }
  ],
  "truncated": false
}
```

A range is at most `range-max-span` (7 days). An answer holds at most
`range-max-points` (10000) points. A longer series is downsampled with
`aggregateWindow`, and `truncated` is `true`.

### Status Codes

| Code | When |
| :--- | :--- |
| `400` | A malformed body, an empty or over-long path, or a wildcard (`+`, `#`, `*`) |
| `401` | No token, a token GitLab rejects or issued to another application, or a forwarded user who is not the token's user |
| `403` | None of the requested paths may be read. Nothing is bound on the broker |
| `413` | More than `max-paths-per-stream` (200) paths |
| `429` | More than `max-streams-per-user` (4) open streams, or the request rate limit |
| `502` | InfluxDB failed while reading a range |

## Where the Signals Come From

- **Live**: RabbitMQ over AMQP 0-9-1. The MQTT plugin publishes to
  `amq.topic` and swaps `/` and `.`, so the topic `a/b/c` is bound as the
  routing key `a.b.c`. The gateway holds one connection per vhost, named by
  `vhost-template` (`{owner}` by default, because the DTaaS services CLI
  creates one vhost per user). Each connection has one exclusive auto-delete
  queue `dtaas-signals.<uuid>`, and streams of the same signal share its
  binding. Messages over `max-message-bytes` (64 KB) are dropped.
- **History**: InfluxDB 2, queried over `/api/v2/query` with Flux whose text
  is fixed and whose values all travel as `params`. The org and bucket come
  from the twin's `influx` transport, and only when they equal
  `influx-org-template` and `influx-bucket-template` filled with the owner.
  Points are matched by the `topic` tag and the `value` field, as Telegraf's
  MQTT consumer writes them.

## Configuration

`config/signals.yaml.sample` documents every key. The service reads
`signals.yaml` from the working directory, the file named by `--config`, or
the file named by `SIGNALS_CONFIG_PATH`. Each key can be overridden with an
environment variable, for example `SIGNALS_GITLAB_URL` for `gitlab-url`.

Secrets are read only from files: `rabbitmq-password-file` holds the
RabbitMQ password, and `influx-tokens-file` holds a JSON object that maps each
org to a read-only token. A plain `rabbitmq-password` or `influx-token` key,
the matching `SIGNALS_*` variable, and credentials inside `rabbitmq-url` are
refused at startup.

CORS is off by default, since the gateway is served from the same origin as
the client behind Traefik.

See [DEVELOPER.md](./DEVELOPER.md) to build, test and set up the read-only
service users.
