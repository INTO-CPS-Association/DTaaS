# Naming Convention for Platform Services

This page sets how users, groups, databases, tables and attributes are named
in every platform service: InfluxDB, RabbitMQ, MongoDB, PostgreSQL,
ThingsBoard, Grafana and GitLab. It has two parts. The first part says how
`dtaas-services` names things today. The second part is the convention that
new resources follow.

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
`dtaas_user` in PostgreSQL, `root` in GitLab, the InfluxDB organisation and
bucket `dtaas`, the PostgreSQL database `thingsboard` and the ThingsBoard
tenant `DTaaS`.

The convention below addresses four consequences of this.

1. Only GitLab checks the username
   (`^[A-Za-z0-9][A-Za-z0-9_.-]{0,254}$`). A username with a dot passes
   GitLab and then cannot be a MongoDB database name, because MongoDB does
   not allow `/\. "$` in database names on Linux
   ([MongoDB limits](https://www.mongodb.com/docs/manual/reference/limits/)).
2. A CSV username that equals an administrator or shared name, such as
   `dtaas` or `thingsboard`, is reported as "already exists" and the
   existing resource is reused without warning.
3. RabbitMQ sends MQTT clients to the virtual host `/` unless the username
   names another one as `vhost:username`
   ([RabbitMQ MQTT plugin](https://www.rabbitmq.com/docs/mqtt)). The
   per-user permissions exist only on the per-user virtual host, so an MQTT
   client must sign in as `<username>:<username>`.
4. InfluxDB buckets are created without a retention period, which means the
   data is kept forever
   ([InfluxDB create a bucket](https://docs.influxdata.com/influxdb/v2/admin/buckets/create-bucket/)).

## The Convention

### Rules for Every Name

| Rule              | Convention                                                               |
| :---------------- | :----------------------------------------------------------------------- |
| Characters        | Lowercase ASCII `a-z`, `0-9` and `_`, starting with a letter             |
| Length            | 3 to 32 characters for usernames and group names                         |
| Words             | `snake_case`, never camelCase, spaces, dots or hyphens                   |
| Quoting           | No name needs quotes in SQL, Flux or the MongoDB shell                   |
| Data in names     | A device, room or project is a value, never part of a table or a field   |
| One key per thing | `username` for people, `group` for teams, `device_id` for devices        |
| Reserved names    | `dtaas`, `admin`, `root`, `postgres`, `thingsboard`, `guest` and `_*`    |

The pattern for a username or a group name is `^[a-z][a-z0-9_]{2,31}$`.
It is valid unquoted in PostgreSQL, which folds unquoted names to lowercase
and allows 63 bytes
([PostgreSQL identifiers](https://www.postgresql.org/docs/current/sql-syntax-lexical.html#SQL-SYNTAX-IDENTIFIERS)).
It is a valid MongoDB database name, a valid InfluxDB bucket name
(two or more characters, no leading `_`, no `"`) and a valid RabbitMQ
virtual host.

Identifier values that come from outside, such as a device ID written by a
sensor maker, keep their own spelling as a value. They never become a name.

### People and Groups

| Concept                 | Name                                      | Example        |
| :---------------------- | :---------------------------------------- | :------------- |
| Person                  | GitLab username                           | `jady`         |
| Team or project         | GitLab group, same pattern                | `swim`         |
| Administrator account   | `dtaas_admin` in every service            | `dtaas_admin`  |
| Program account         | `<group>_<purpose>`                       | `swim_ingest`  |
| Read-only program       | `<group>_<purpose>_ro`                    | `swim_view_ro` |

A program account belongs to a group and has only the permissions its
purpose needs. A person never shares a program account.

### InfluxDB

| Concept     | Name                                       | Example     |
| :---------- | :----------------------------------------- | :---------- |
| Organisation| `<group>`, or `<username>` for own data    | `swim`      |
| Bucket      | `<group>` or `<group>_<purpose>`           | `swim_raw`  |
| Measurement | What was measured, singular                | `reading`   |
| Tag         | `snake_case`, what the value describes     | `device_id` |
| Field       | `snake_case`, usually `value`              | `value`     |
| Token       | `<username or account>_<purpose>`          | `swim_ingest_write` |

Data lives in tag and field values, never in measurement or field names
([InfluxDB schema design](https://docs.influxdata.com/influxdb/v2/write-data/best-practices/schema-design/)).
Every bucket has a retention period chosen when it is created.

### RabbitMQ and MQTT

| Concept       | Name                                         | Example                  |
| :------------ | :------------------------------------------- | :----------------------- |
| Virtual host  | `<group>`, or `<username>` for own data      | `swim`                   |
| Exchange      | `<group>.<purpose>`                          | `swim.readings`          |
| Queue         | `<consumer>.<purpose>`                       | `telegraf.readings`      |
| MQTT username | `<vhost>:<username>`                         | `swim:swim_ingest`       |
| MQTT topic    | `<project>/<building>/<level>/<unit_id>/<area>/<device_type>/<device_id>/<quantity>` | see below |

Topics are case-sensitive and use one quantity per topic
([MQTT 3.1.1, section 4.7.3](https://docs.oasis-open.org/mqtt/mqtt/v3.1.1/os/mqtt-v3.1.1-os.html)).
The topic levels become tags or columns with the same names in every store.

### MongoDB

| Concept    | Name                                         | Example    |
| :--------- | :------------------------------------------- | :--------- |
| Database   | `<group>`, or `<username>` for own data      | `swim`     |
| Collection | Plural noun, `snake_case`                    | `devices`  |
| Time series collection | Singular, as in InfluxDB         | `reading`  |
| Field      | `snake_case`                                 | `device_id`|

A time series collection uses `timeField: "time"` and `metaField: "meta"`,
and queries filter on fields inside `meta`
([MongoDB time series best practices](https://www.mongodb.com/docs/manual/core/timeseries/timeseries-best-practices/)).

### PostgreSQL

| Concept  | Name                                         | Example     |
| :------- | :------------------------------------------- | :---------- |
| Database | `<group>`, or `<username>` for own data      | `swim`      |
| Role     | Same as the user or account                  | `swim_view_ro` |
| Schema   | `public`, or one per purpose                 | `public`    |
| Table    | Singular noun                                | `device`    |
| Column   | `snake_case`, time in `timestamptz`          | `device_id` |

### ThingsBoard

| Concept         | Name                                         | Example        |
| :-------------- | :------------------------------------------- | :------------- |
| Tenant          | One per installation                         | `DTaaS`        |
| Customer        | `<group>`, or `<username>` for own data      | `swim`         |
| Device          | The `device_id`                              | `S-SWiM-CTO-room-0224-seat48A-TRH-0001` |
| Device profile  | `<device_type>_<model>`                      | `s_trh`        |
| Telemetry key   | The quantity, one lowercase word             | `temperature`  |
| Attribute key   | `snake_case`                                 | `unit`         |
| Dashboard       | Title Case title                             | `Room 0224 Climate` |

ThingsBoard advises camelCase for telemetry keys
([ThingsBoard telemetry](https://thingsboard.io/docs/user-guide/telemetry/)).
A single lowercase word meets both that advice and this convention.

### Grafana

| Concept       | Name                                        | Example                 |
| :------------ | :------------------------------------------ | :---------------------- |
| Organisation  | One per installation                        | `DTaaS`                 |
| Team          | `<group>`, mapped from the GitLab group     | `swim`                  |
| Folder        | `<group>`                                   | `swim`                  |
| Dashboard UID | `<group>-<subject>`, lowercase, 8 to 40 characters | `swim-room-climate` |
| Variable      | The tag or column it filters                | `$device_id`            |
| Data source   | `<service>_<bucket or database>`            | `influxdb_swim`         |

Dashboards are provisioned from files under version control
([Grafana provisioning](https://grafana.com/docs/grafana/latest/administration/provisioning/),
[dashboard JSON model](https://grafana.com/docs/grafana/latest/visualizations/dashboards/build-dashboards/view-dashboard-json-model/)).

### GitLab

| Concept       | Name                                   | Example        |
| :------------ | :------------------------------------- | :------------- |
| User          | The username pattern above             | `jady`         |
| Group         | The group pattern above                | `swim`         |
| Access token  | `dtaas_<purpose>`                      | `dtaas_client` |

### Sensor Readings

One reading has the same names in every store.

| Topic level | Tag or column | Example                                  |
| :---------- | :------------ | :--------------------------------------- |
| 1           | `project`     | `SWiM`                                   |
| 2           | `building`    | `CTO`                                    |
| 3           | `level`       | `room`                                   |
| 4           | `unit_id`     | `0224`                                   |
| 5           | `area`        | `seat48A`                                |
| 6           | `device_type` | `S` for sensor, `A` for actuator         |
| 7           | `device_id`   | `S-SWiM-CTO-room-0224-seat48A-TRH-0001`  |
| 8           | `quantity`    | `temperature`                            |

The payload is `{"value": 24.87, "ts": "2026-10-30T17:40:08+08:00",
"unit": "Cel"}`. The time is RFC 3339 with its offset and is stored in UTC.
The unit is a SenML code such as `Cel` or `%RH`
([IANA SenML units](https://www.iana.org/assignments/senml/senml.xhtml)).
The measurement, table or collection is `reading` and `device_id` joins
every store.

## What Changes in `dtaas-services`

The convention is not enforced by the code yet. The changes it needs are:

1. Validate every CSV username against `^[a-z][a-z0-9_]{2,31}$` and
   reject the reserved names before any service is touched.
2. Rename the administrator accounts to `dtaas_admin`.
3. Create group resources as well as per-user ones.
4. Set a retention period on every InfluxDB bucket.
5. Document the `vhost:username` form for MQTT clients.
