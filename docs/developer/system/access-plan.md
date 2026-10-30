# Access and Single Sign-On Plan

This page plans how a person signs in to DTaaS once and receives, with that
one sign-in, every access they have: website pages, client extensions,
workspace tools, servers, platform services and data. The same sign-in
decides what the person can see and what stays hidden. It is a plan for
discussion. Nothing on this page is implemented yet and each step becomes
its own pull request.

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
5. Every client extension and menu page is shown to every signed-in
   person.
6. The platform services (GitLab, Grafana, ThingsBoard, RabbitMQ,
   InfluxDB, MongoDB and PostgreSQL) are not behind the sign-in. Each
   listens on its own port and has its own accounts, made by
   `dtaas-services user add` from `config/credentials.csv`. A person
   signs in to each one separately, with a separate password.
7. The website does not know which services exist or which ones a person
   may open.

## Goals

- One sign-in gives every access the person has, with no second password
  for any part of DTaaS.
- One table, under version control, says which group gets which role in
  every component.
- The website shows only the pages, extensions, workspace tools and
  services the person may use.
- Leaving a group removes the access everywhere when the tokens expire,
  and signing out ends every session.
- Every component still checks access itself. Hiding a link is a
  convenience and not a control
  ([OWASP Authorization Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html)).
- Only port 443 open to people, plus MQTT over TLS for devices.

## What the Sign-In Covers

| Component                      | Examples                                          | How it trusts the sign-in                        |
| :----------------------------- | :------------------------------------------------ | :----------------------------------------------- |
| Website pages                  | Library, Digital Twins, Workbench, Account        | Session held by a website backend                |
| Client extensions              | Building Models, visualisation                    | Declared roles, calls carry the person's token   |
| Workspace tools                | JupyterLab, VS Code, desktop over VNC, terminal   | The gate checks owner or group of the workspace  |
| Platform servers               | Library, runner, logger, signals gateway          | The gate and a token for that server             |
| GitLab                         | Twins, projects, CI runs                          | OpenID Connect sign-in through the provider      |
| Grafana                        | Dashboards                                        | Generic OAuth, roles from the token              |
| ThingsBoard                    | Devices, dashboards                               | OAuth 2.0 with a custom mapper                   |
| RabbitMQ                       | Management, AMQP, MQTT                            | OAuth 2.0 plugin, the token as password          |
| PostgreSQL                     | Twin databases                                    | OAuth with a validator module                    |
| InfluxDB, MongoDB              | Time series, documents                            | Short-lived accounts made from the person's roles |
| Devices and programs           | Sensors, Telegraf, CI jobs                        | Their own accounts, never a person's             |

### Sources for Each Service

- GitLab Free self-managed accepts an external OpenID Connect provider such
  as Keycloak
  ([GitLab OpenID Connect](https://docs.gitlab.com/administration/auth/oidc/)).
- Grafana maps a claim in the token to a role with `role_attribute_path`
  ([Grafana generic OAuth](https://grafana.com/docs/grafana/latest/setup-grafana/configure-access/configure-authentication/generic-oauth/)).
  Team sync is an Enterprise feature, so teams are made by provisioning.
- ThingsBoard signs in with OAuth 2.0 and maps the token to a tenant,
  customer and user with a mapper
  ([ThingsBoard OAuth 2.0](https://thingsboard.io/docs/user-guide/oauth-2-support/)).
- RabbitMQ reads the scopes in the token. AMQP and MQTT clients pass the
  token as the password and the management interface signs in with the
  authorization code flow
  ([RabbitMQ OAuth 2.0](https://www.rabbitmq.com/docs/oauth2)).
- PostgreSQL 18, the version DTaaS installs, accepts OAuth bearer tokens.
  It checks them with a validator module chosen for the provider
  ([PostgreSQL OAuth](https://www.postgresql.org/docs/18/auth-oauth.html)).
- MongoDB supports OpenID Connect only in the Enterprise edition
  ([MongoDB OIDC](https://www.mongodb.com/docs/manual/core/oidc/security-oidc/)).
  InfluxDB 2 OSS has no OpenID Connect sign-in in its documentation. Both
  therefore receive short-lived accounts, made for the person from their
  roles and removed when they expire.

## Target Design

### One Identity Provider

Keycloak runs one realm, `dtaas`, with GitLab as the login behind it.
Every component is a client of that realm. A person signs in once and the
Keycloak session signs them in to every component they open.

GitLab's ID token carries only `groups_direct` and further group claims
come from its userinfo endpoint
([GitLab as OpenID Connect provider](https://docs.gitlab.com/integration/openid_connect_provider/)).
Keycloak reads the GitLab groups and puts the roles in the tokens it
issues.

### One Access Table

One file in the repository maps each group and level to a role in every
component. Keycloak and the services are configured from it, so a change
of access is a reviewed commit.

| Component          | `<group>_viewer`          | `<group>_member`             | `<group>_admin`            |
| :----------------- | :------------------------ | :--------------------------- | :------------------------- |
| Website pages      | Library, Digital Twins    | All pages of the group       | All pages of the group      |
| Client extensions  | View only                 | Use                          | Use and configure          |
| Workspace tools    | None                      | Own workspace                | Own workspace              |
| GitLab group       | Reporter                  | Developer                    | Maintainer                 |
| Grafana folder     | Viewer                    | Editor                       | Admin                      |
| ThingsBoard customer | Read-only user          | Customer user                | Customer admin             |
| RabbitMQ vhost     | Read                      | Read and write               | Configure                  |
| Databases of the group | Read                  | Read and write               | Owner                      |

The role names follow the naming convention for the platform services.
The levels in this table are a first proposal for the team to decide.

### One Access Profile

A small service behind the gate answers at `{appURL}/platform/access`. It
reads who is asking from the session and returns, for every component,
whether the person may use it, with which role and the link. It checks
that each service answers before listing it.

The website builds its menu, the extension list, the Workbench tools and
the services list from this one answer. A client extension declares the
roles it needs and the host leaves it out for a person without them.

### Tokens Stay on the Server

The website gets a backend that holds the tokens. The browser holds only
an `HttpOnly`, `Secure` and `SameSite` cookie
([RFC 10017](https://www.rfc-editor.org/rfc/rfc10017.html)). When the
website or an extension calls a server, the backend exchanges the
person's token for one meant only for that server. Keycloak supports this
standard token exchange by default
([Keycloak token exchange](https://www.keycloak.org/securing-apps/token-exchange)).
Every token is short-lived and has one audience
([RFC 9700](https://www.rfc-editor.org/rfc/rfc9700.html)).

### One Gate

Traefik sends every request through one maintained forward-auth proxy
that checks the session and the group. The databases and the broker's
management port are reached only through the services, never from
outside.

### Devices and Programs

Devices, Telegraf and CI jobs use program accounts named
`<group>_<purpose>`, with only the permissions their purpose needs.
Where a service accepts tokens, a program gets one from Keycloak with the
client credentials grant. Their secrets are mounted as files, never put
in images or repositories.

## Steps

Each step is one pull request and can be reviewed on its own.

1. Write the access table and the group and role names.
2. Pin the forward-auth image to a digest, or replace it with a
   maintained proxy that checks groups.
3. Add the Keycloak realm `dtaas` with GitLab as the login, in one test
   installation.
4. Sign in to GitLab, Grafana and ThingsBoard through Keycloak.
5. Add the access profile service and build the website menu, extension
   list, Workbench tools and services list from it.
6. Move the website tokens to a backend, with token exchange for calls to
   the servers.
7. Sign in to RabbitMQ with tokens, for people and for MQTT and AMQP
   programs.
8. Sign in to PostgreSQL with tokens, after choosing a validator module.
9. Add short-lived accounts for InfluxDB and MongoDB.
10. Close every service port except 443 and MQTT over TLS.
11. Make signing out end the sessions in every component.

## Open Questions

- Does every installation run Keycloak, or only the multi-user ones?
- Are viewer, member and admin the right levels and who owns the access
  table?
- Which validator module does PostgreSQL use and is it maintained?
- What makes the short-lived InfluxDB and MongoDB accounts and how long
  do they last?
- Do devices outside the network keep a separate MQTT account?
