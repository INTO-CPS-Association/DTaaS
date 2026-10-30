# Access and Single Sign-On Plan

This page plans how people sign in to DTaaS once and see only the platform
services their role allows. It is a plan for discussion. Nothing on this
page is implemented yet, and each step becomes its own pull request.

## How Access Works Today

1. A person signs in to the website through one identity provider per
   installation: GitLab (the default), Keycloak or Dex.
2. The React client runs OAuth 2.0 with PKCE and keeps the access token in
   the browser.
3. `traefik-forward-auth` protects the website, the library microservice
   and the workspaces. The image is `thomseddon/traefik-forward-auth` with
   the `latest` tag, and it has no rules for groups.
4. Each workspace lists its own tools at `{appURL}/{username}/services`,
   and the Workbench page shows them.
5. The platform services (InfluxDB, RabbitMQ, MongoDB, PostgreSQL,
   ThingsBoard and Grafana) are not behind the sign-in. Each listens on its
   own port and has its own accounts, made by `dtaas-services user add`
   from `config/credentials.csv`.
6. The website has no list of the platform services and does not know
   which ones a person may open.

## Goals

- One sign-in with the GitLab account for the website and every service
  that supports it.
- Roles taken from GitLab groups, kept in one table under version control.
- A list of the services a signed-in person may open, shown in the
  Workbench.
- Every service still checks access itself. Hiding a link is a
  convenience and not a control
  ([OWASP Authorization Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html)).
- Only port 443 open to people, plus MQTT over TLS for devices.

## Non-Goals

- Replacing GitLab as the place where twins are stored and run.
- Single sign-on to the databases. InfluxDB OSS, MongoDB Community and
  PostgreSQL have no OpenID Connect login in their documentation, so they
  keep accounts made by the platform.

## Target Design

| Layer             | Target                                                                       |
| :---------------- | :--------------------------------------------------------------------------- |
| Identity provider | Keycloak in front, with GitLab as the login behind it                        |
| Roles             | GitLab groups mapped to roles in the tokens                                  |
| Website tokens    | A backend for the website holds the tokens, the browser holds a cookie       |
| Gate              | Traefik with a maintained forward-auth proxy that checks groups              |
| Service list      | A backend endpoint returns the services allowed for the person               |
| Web services      | Grafana, RabbitMQ and ThingsBoard sign in with the same identity             |
| Databases         | Reached only by the services and by program accounts, never from outside     |
| Devices           | Own accounts with the least privilege, secrets mounted as files              |

### Identity Provider and Roles

GitLab's OpenID Connect ID token carries only `groups_direct`. Group and
role claims beyond that come from the userinfo endpoint
([GitLab as OpenID Connect provider](https://docs.gitlab.com/integration/openid_connect_provider/)).
Keycloak can broker the GitLab login and put roles in the tokens that the
services read. The mapping from group to role lives in one file in the
repository.

### Website Tokens

The OAuth 2.0 for Browser-Based Applications best current practice
recommends a backend that holds the tokens, with an `HttpOnly`, `Secure`
and `SameSite` cookie in the browser
([RFC 10017](https://www.rfc-editor.org/rfc/rfc10017.html)). Access tokens
are short-lived and each has one audience
([RFC 9700](https://www.rfc-editor.org/rfc/rfc9700.html)).

### Service Sign-In

| Service     | How it signs in with the shared identity                                                                  |
| :---------- | :-------------------------------------------------------------------------------------------------------- |
| Grafana     | Generic OAuth with `role_attribute_path` ([Grafana](https://grafana.com/docs/grafana/latest/setup-grafana/configure-access/configure-authentication/generic-oauth/)) |
| RabbitMQ    | OAuth 2.0 plugin reads scopes from the token ([RabbitMQ](https://www.rabbitmq.com/docs/oauth2))           |
| ThingsBoard | OAuth 2.0 with a custom mapper ([ThingsBoard](https://thingsboard.io/docs/user-guide/oauth-2-support/))   |
| InfluxDB    | Accounts and tokens made by the platform                                                                  |
| MongoDB     | Accounts made by the platform                                                                             |
| PostgreSQL  | Accounts made by the platform                                                                             |

### Service List per Person

A small service behind the gate answers at `{appURL}/platform/services`. It
reads who is asking from the sign-in, looks up the person's roles, checks
that each service answers, and returns name, link and role for the
services the roles allow. The Workbench shows these next to the workspace
tools.

## Steps

Each step is one pull request and can be reviewed on its own.

1. Pin the forward-auth image to a digest, or replace it with a maintained
   proxy that checks groups.
2. Write the group-to-role table, with group names that follow the
   naming convention for the platform services.
3. Add Keycloak with GitLab as the login, in one test installation.
4. Sign in to Grafana with the shared identity, mapping groups to roles.
5. Add the service list endpoint and the Workbench section.
6. Sign in to RabbitMQ and ThingsBoard with the shared identity.
7. Move the website tokens to a backend.
8. Close the database ports to the outside.

## Open Questions

- Does every installation run Keycloak, or only the multi-user ones?
- Which roles exist: viewer, member and admin per group, or more?
- Who owns the group-to-role table?
- How do program accounts get their secrets on the server?
- Do devices outside the network keep a separate MQTT account?
