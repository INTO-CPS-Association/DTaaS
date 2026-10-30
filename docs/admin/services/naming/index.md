# Naming Convention

This section sets how everything in a DTaaS installation is named: people,
groups, roles, accounts, queues, topics, databases, tables, columns,
fields, relationships, dashboards, devices, containers and settings. One
thing has one name, written the same way in every service, so that a
person, a program or a query can follow it from the broker to the database
to the dashboard.

The section has four pages:

- This page: the rules for every name, identity and the names
  `dtaas-services` makes today.
- [Messaging](messaging.md): RabbitMQ and MQTT.
- [Databases](databases.md): InfluxDB, PostgreSQL and MongoDB, including
  relationships between records.
- [Applications](applications.md): ThingsBoard, Grafana, GitLab,
  Keycloak, containers and settings.

## Rules for Every Name

| Rule              | Convention                                                                 |
| :---------------- | :------------------------------------------------------------------------- |
| Characters        | Lowercase ASCII `a-z`, `0-9` and `_`, starting with a letter               |
| Words             | `snake_case`, never camelCase, spaces or dots                              |
| Language          | English, full words, abbreviations only when common (`id`, `co2`, `url`)   |
| Quoting           | No name needs quotes in SQL, Flux, the MongoDB shell or a topic filter     |
| Data in names     | A device, room, person or date is a value, never part of a name            |
| Singular          | A table, measurement or record type is singular (`device`, `reading`)      |
| Identifier        | `<thing>_id`, for example `device_id`, `user_id`, `building_id`            |
| Time              | `time` for the moment of a reading, `<event>_at` for events (`created_at`) |
| Yes or no         | `is_<state>` or `has_<thing>`, for example `is_active`                     |
| Units             | Kept in a `unit` value, never in a name (`value` and `unit`, not `temp_c`) |
| Reserved prefixes | `_`, `amq.`, `system.` and `pg_` are left to the services                  |

Some names follow another rule because a service or the repository
already requires it. The page for that service says so:

- MQTT topic levels use `/`.
- RabbitMQ exchange and queue names use `.`.
- Grafana dashboard UIDs, Git branches, Docker networks and compose files
  use `-`.
- Environment variables and CI variables are `UPPER_SNAKE_CASE`.
- Titles that people read, such as dashboards, rule chains, the
  ThingsBoard tenant and the Grafana organisation, use Title Case.

Identifier values that come from outside, such as a device ID written by
a sensor maker, keep their own spelling as a value. They never become a
name.

## Identity

| Concept            | Name                                          | Example        |
| :----------------- | :-------------------------------------------- | :------------- |
| Person             | GitLab username                               | `jady`         |
| Group              | GitLab group, same pattern                    | `swim`         |
| Role               | `<group>_<level>`                             | `swim_member`  |
| Role level         | `viewer`, `member` or `admin`                 | `viewer`       |
| Program account    | `<group>_<purpose>`                           | `swim_ingest`  |
| Read-only program  | `<group>_<purpose>_ro`                        | `swim_view_ro` |
| Administrator      | `dtaas_admin` in every service                | `dtaas_admin`  |

The pattern for a username, a group or an account is
`^[a-z][a-z0-9_]{2,31}$`. It is valid unquoted in PostgreSQL, which folds
unquoted names to lowercase and allows 63 bytes
([PostgreSQL identifiers](https://www.postgresql.org/docs/current/sql-syntax-lexical.html#SQL-SYNTAX-IDENTIFIERS)).
It is a valid MongoDB database name, which may not contain `/\. "$`
([MongoDB limits](https://www.mongodb.com/docs/manual/reference/limits/)).
It is a valid InfluxDB bucket name, which needs two or more characters
and may not start with `_`
([InfluxDB buckets](https://docs.influxdata.com/influxdb/v2/admin/buckets/create-bucket/)).
It is also a valid RabbitMQ virtual host and queue name.

These names are reserved and are never given to a person or a group:
`dtaas`, `dtaas_admin`, `admin`, `root`, `postgres`, `thingsboard`,
`guest`, `grafana`, `influxdb`, `mongodb`, `rabbitmq`, `gitlab`,
`keycloak` and `public`.

A program account belongs to a group and has only the permissions its
purpose needs. A person never shares a program account. A program never
uses a person's account.

Every resource that belongs to a group is named after the group. A
resource for one person only, such as a private bucket, is named after the
username. A group name and a username never coincide, because both come
from the same GitLab namespace.

## Names Made Today

`dtaas-services user add` reads `config/credentials.csv`
(`username,password,email`) and creates one set of resources per row.
Every per-user name is the CSV username, with its case kept as written.

| Service     | Resource made per user                          | Name           |
| :---------- | :---------------------------------------------- | :------------- |
| InfluxDB    | User, organisation and bucket                   | `<username>`   |
| RabbitMQ    | User and virtual host, full permissions on it   | `<username>`   |
| MongoDB     | User and database, role `readWrite` on it       | `<username>`   |
| PostgreSQL  | Role and database, both quoted                  | `"<username>"` |
| ThingsBoard | Customer in the shared tenant `DTaaS`           | `<username>`   |
| ThingsBoard | Customer user, signs in with the CSV email      | `<email>`      |
| GitLab      | User with display name and access token `dtaas` | `<username>`   |
| Grafana     | Nothing, only the administrator account exists  |                |

The administrator accounts and the shared names come from `config/.env`:
`dtaas` in RabbitMQ, InfluxDB and Grafana, `dtaas123` in MongoDB,
`dtaas_user` in PostgreSQL, `root` in GitLab, the InfluxDB organisation
and bucket `dtaas`, the PostgreSQL database `thingsboard` and the
ThingsBoard tenant `DTaaS`.

The convention addresses four consequences of this.

1. Only GitLab checks the username
   (`^[A-Za-z0-9][A-Za-z0-9_.-]{0,254}$`). A username with a dot passes
   GitLab and then cannot be a MongoDB database name.
2. A CSV username that equals an administrator or shared name, such as
   `dtaas` or `thingsboard`, is reported as "already exists" and the
   existing resource is reused without warning.
3. RabbitMQ sends MQTT clients to the virtual host `/` unless the username
   names another one as `vhost:username`
   ([RabbitMQ MQTT plugin](https://www.rabbitmq.com/docs/mqtt)). The
   per-user permissions exist only on the per-user virtual host.
4. InfluxDB buckets are created without a retention period, so the data
   is kept forever.

## What Changes in `dtaas-services`

The convention is not enforced by the code yet. The changes it needs are:

1. Validate every CSV username against `^[a-z][a-z0-9_]{2,31}$` and
   reject the reserved names before any service is touched.
2. Rename the administrator accounts to `dtaas_admin`.
3. Create group resources, named after the GitLab group, as well as
   per-user ones.
4. Create the roles `<group>_viewer`, `<group>_member` and
   `<group>_admin` in every service that has roles.
5. Set a retention period on every InfluxDB bucket.
6. Document the `vhost:username` form for MQTT clients.
