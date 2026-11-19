# Signals Gateway Service Accounts

The signals path uses accounts in RabbitMQ and PostgreSQL of the
[platform services](../../services/cli.md). `dtaas-services` makes every one
of them with a random password. A password reaches `rabbitmqctl` through
standard input and a PostgreSQL role gets a SCRAM-SHA-256 verifier. No
password appears in a process list, a shell history or a server log. Each
password is written to a file with mode 600 under `secrets/`, in a folder per
container that reads it.

Run the commands on the host of the platform services, in the folder that
`dtaas-services project generate` made, while RabbitMQ and PostgreSQL run.

## The Accounts

| Account | Service | May | Secret file |
| :------ | :------ | :-- | :---------- |
| `dtaas_signals` | RabbitMQ, MQTT in the vhost `/` | Subscribe to every topic of the projects served and publish only to their command topics, `<project>/<six levels>/cmd/<command>` | `secrets/signals/rabbitmq_dtaas_signals_password` |
| `dtaas_signals_ro` | PostgreSQL, every group database | Select from `device` and `reading` | `secrets/signals/postgresql_dtaas_signals_ro_password` |
| `<group>_telegraf` | RabbitMQ, MQTT in the vhost `/` | Subscribe to the topics of the group's projects and publish nowhere | `secrets/telegraf/rabbitmq_<group>_telegraf_password` |
| `<group>_telegraf` | PostgreSQL, database `<group>` | Insert into `reading` | `secrets/telegraf/postgresql_<group>_telegraf_password` |
| `<group>_view_ro` | PostgreSQL, database `<group>` | Select from `device` and `reading`, for the Grafana data source `postgresql_<group>` | `secrets/grafana/postgresql_<group>_view_ro_password` |

In RabbitMQ each account may declare, bind and read only its own MQTT session
queues (`mqtt-subscription-<account>_*`) and use `amq.topic`, where the MQTT
plugin publishes. No other role may connect to a group database. The gateway's
two accounts serve every user, so the gateway checks each request against the
person's own rights before it uses them.

## The Gateway's MQTT Account

Create `dtaas_signals` with the projects the gateway serves. A project is the
first level of an MQTT topic:

```bash
dtaas-services user add-signals -p SWiM -p Soil
```

The command prints the path of the password file. Running it again keeps the
password and replaces the list of projects, so a project left out can no
longer be read through the gateway.

## The History of a Group

Set up each group once, before its twins are registered, with the projects
whose topics it stores:

```bash
dtaas-services user add-history -g swim -p SWiM
```

This makes:

- The MQTT account `swim_telegraf`, which reads the topics of `SWiM`.
- The database `swim` with the tables `device` and `reading` and the index
  `reading_device_id_time_idx`.
- The roles `swim_telegraf`, `swim_view_ro` and `dtaas_signals_ro`, with the
  rights in the table above.
- The Grafana data source `postgresql_swim` in
  `config/grafana/provisioning/datasources`. It connects with
  `sslmode: require` and reads its password from the file that Grafana mounts
  under `/run/secrets`.

Grafana reads its data sources when it starts:

```bash
dtaas-services service restart -s grafana
```

A group name matches `^[a-z][a-z0-9_]{2,31}$` and names such as `dtaas`,
`admin`, `postgres` or `grafana` are reserved. A kit installed under
`config/kits/<kit>/` adds its own tables in the same run, as the
[platform services page](../../services/cli.md) describes.

## The Owners File

The gateway serves a declared topic only when it starts with a topic prefix of
the group that owns the twin. Map each GitLab project path under the DTaaS
group whose twins use the group with a repeatable `--owner`:

```bash
dtaas-services user add-history -g swim -p SWiM -o jady
```

The owners go to `secrets/signals/signals_owners.json`, mode 600:

```json
{"jady": {"group": "swim", "topics": ["SWiM/"]}}
```

A second run adds new topics to an owner. An owner already mapped to another
group is refused before any service is touched. The gateway reads the file on
each decision, so a new copy needs no restart. Without the file it serves no
topic.

## Register a Twin

A twin belongs to one group and owns one topic prefix. Its file lists each
device with its topic without the quantity, seven levels that start with the
prefix. `ifc_guid` and `brick_class` are optional:

```json
{
  "group": "swim",
  "twin": "room_0224",
  "topic_prefix": "SWiM/CTO/room/0224",
  "devices": [
    {"topic": "SWiM/CTO/room/0224/seat48A/S/S-SWiM-CTO-room-0224-seat48A-TRH-0001",
     "brick_class": "Air_Temperature_Sensor"}
  ]
}
```

```bash
dtaas-services twin register -f room_0224.json
```

The command renders the twin's Telegraf file from one template and runs
`telegraf config check` on it, with the local `telegraf` or the image
`telegraf:1.40.2` through Docker. Without either it writes nothing. After the
check it writes the `device` rows and then moves the file into
`config/telegraf/telegraf.d`, which Telegraf watches. The file reads the
twin's topics with the client ID `<group>_telegraf_<twin>`, QoS 1 and a
persistent session, so the broker keeps the readings that arrive while
Telegraf reloads. A reading of a device that is not registered is dropped by
Telegraf and refused by the foreign key of `reading`.

```bash
dtaas-services twin remove -g swim -t room_0224
```

This deletes the twin's file, sends SIGHUP to the `telegraf` container so the
agent reloads, waits until Telegraf has left its MQTT session queue and then
deletes that queue. Devices and readings are kept.

## Secret Files

```text
secrets/
|- signals/     # Read by the signals gateway
|  |- rabbitmq_dtaas_signals_password
|  |- postgresql_dtaas_signals_ro_password
|  \- signals_owners.json
|- telegraf/    # Mounted by the telegraf container at /run/secrets
\- grafana/     # Mounted by the grafana container at /run/secrets
```

The gateway runs in a DTaaS package, often on another host. Copy the three
files of `secrets/signals/` into `config/secrets/` of the package, as
[Docker](docker.md) describes. Copy `signals_owners.json` again after each
`user add-history --owner`. Keep the files out of version control and
readable only by the user that runs the container that reads them.
