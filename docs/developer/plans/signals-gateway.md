# Signals Gateway: Requirements and Choices

This plan opens the first of the pull requests that split #1879. It states who
needs the signals of a digital twin, what the platform must guarantee to each of
them and the choice made for each requirement.

## How #1879 Is Split

The gateway comes in four pull requests, each with the documentation it
touches. Each one starts after the previous one is merged.

| Order | Pull request | Content taken from #1879 |
| :---- | :----------- | :----------------------- |
| 1 | Design and skeleton | This plan, the service with its configuration and CI workflow, a health route and placeholder `stream` and `range` routes |
| 2 | Security framework | Sign-in check, access policy, rate limits and the decision log |
| 3 | API | Live samples from RabbitMQ (AMQP and MQTT) as server-sent events and history from InfluxDB |
| 4 | Developer and deployment | Docker image, the four docker packages, the administrator pages and the `dtaas-services` commands for the read-only RabbitMQ user and InfluxDB tokens |

The client parts follow discussion #1912 on the Extension API and wait for its
decisions on the name and place of the contract.

| Order | Pull request | Content taken from #1879 |
| :---- | :----------- | :----------------------- |
| 1 | Extension API core | The contract now in `client/sdk` |
| 2 | Web extension host | Host services, extension registration in `extensions.ts`, menu, routes and the credentials held in the client core |
| 3 | `bim` as an extension | The Buildings page moved out of the client into its own package |
| 4 | Visualisation | The common core, the Visualise tab and the `image` and `embed` substrates, reading signals through the gateway after gateway pull request 3 |

## Who Reads and Writes Signals

| Who | Where it runs | What it needs |
| :-- | :------------ | :------------ |
| A client extension, for example `bim` | The user's browser | Read live and past signals of the twins the user can read |
| A digital twin in a workspace | A container on the DTaaS server | Read and write signals of its own project, with low delay |
| A digital twin started by a GitLab runner | A remote machine | Read and write signals of its own project, for the length of the job |
| A device or an external system, such as the NTU sensors of room 02-24 | A partner's network | Write the signals of one project only |
| Grafana and ThingsBoard | The DTaaS server | Read the signals of the groups their users belong to |

## Requirements

| ID | Requirement |
| :- | :---------- |
| G1 | The browser holds no credential of RabbitMQ, MQTT or InfluxDB. |
| G2 | A person reads only the signals of twins that person may read, decided on the server. |
| G3 | A program that runs on a server or a runner reaches the services with the standard protocols and client libraries, without the gateway in its path. |
| G4 | Every credential is scoped to one project or group and a runner's credential ends with the job. |
| G5 | The sign-in works with GitLab, Keycloak and Dex, the providers DTaaS installations use today. |
| G6 | The access decision sits behind one interface, so the rule can change without changing the API. |
| G7 | A person who leaves a group loses access at the next check, with no account to delete by hand in each service. |
| G8 | The browser and the gateway read the same `visualisation.json`, so the page never asks for a path the gateway refuses. |
| G9 | Every extension uses the same gateway and an extension may add its own backend where the common one does not fit. |

## Choices

### Browser Through the Gateway, Programs Directly (G1, G3)

The browser reaches signals only through the gateway. Programs on the server, on
a runner or at a partner connect to RabbitMQ, MQTT and InfluxDB directly, with
their own scoped credential. A program needs to write, needs low delay and
already has client libraries for these protocols, so putting the gateway in its
path adds a hop and a single point of failure without adding protection.
ThingsBoard and Azure IoT Hub draw the same line: devices connect to the broker
and people see the data through the platform's own backend.

### One Common Gateway, Extension Backends Allowed (G9)

There is one signals gateway for all extensions, as the first common platform
service. An extension that needs something the gateway does not serve, for
example a protocol of its own domain, may add its own backend later. A gateway
per extension is not the default, because it would repeat the sign-in and access
code in each one.

### Sign-In Through OpenID Connect (G5)

Today the gateway asks GitLab who owns a token. The skeleton keeps that behind
the identity interface and adds token validation through OpenID Connect
discovery and the provider's published keys, so Keycloak and Dex work the same
way. The token must be issued to the DTaaS client application (its `aud` or
client id) and an empty client id stops the service at startup instead of only
logging a warning.

### Access by Group Role (G2, G6, G7)

Today a path is allowed when a `visualisation.json` committed in a GitLab
project the person can read declares it. That rule stays as the first policy
behind `AccessPolicy`. The next policy reads the group roles of the access plan
(`<group>_viewer`, `<group>_member`, `<group>_admin`). Both are checked on every
request against a cache of at most 60 seconds, so removing a person from a group
takes effect within a minute.

### Credentials for Programs (G3, G4, G7)

| Program | Credential |
| :------ | :--------- |
| Twin in a workspace | A broker account and an InfluxDB token for the group, limited to the group's topics and bucket, mounted as files |
| Twin on a GitLab runner | The job's GitLab ID token (`id_tokens` with an audience for RabbitMQ), used as the password with the RabbitMQ OAuth 2.0 plugin. It expires with the job and its `project_path` and `namespace_path` claims map to the group's scopes. A masked and protected CI/CD variable is the fallback for installations without the plugin |
| Device or external system | One broker account per device or partner, with write permission only on that project's topics |
| Gateway | A read-only broker account and one read-only InfluxDB token per bucket, from `dtaas-services` |

### Topics and Virtual Hosts

The services decision is that all MQTT traffic goes through the virtual host
`/`, separated by topic permissions per project. The gateway today opens one
connection per owner virtual host (`vhost-template: "{owner}"`). To follow the
decision, the template becomes `/` and the access policy checks the topic prefix
of the project. Both are configuration of the existing code. RabbitMQ applies
topic authorisation to MQTT and allows every topic to an account that has no
topic permission, so topic permissions have to be set for every account before
`/` is shared.

### One Source of `visualisation.json` (G8)

Today the client reads the file from the user's workspace and the gateway reads
the copy committed in GitLab. When the two differ, the page asks for paths the
gateway refuses. The client will read the committed copy, which is the one
the gateway reads. The page will show which paths were refused.

### API Style

Live samples go out as server-sent events and past samples as JSON over HTTP.
Server-sent events pass through Traefik and proxies as ordinary HTTP and
reconnect on their own. A WebSocket or an MQTT subscription over WebSocket would
also work. The skeleton keeps the transport behind the stream service, so it can
change.

## Open Questions

1. Does a runner's job reach RabbitMQ through the OAuth 2.0 plugin, or through a
   CI/CD variable at first?
2. Is `/` with topic permissions confirmed for the gateway as well, or does a
   group keep its own virtual host?
3. Should the gateway also serve ThingsBoard telemetry, or do dashboards read
   ThingsBoard directly?
