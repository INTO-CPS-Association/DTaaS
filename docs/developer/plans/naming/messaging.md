# Messaging Names

How virtual hosts, exchanges, queues, bindings, MQTT topics, clients and
message payloads are named in RabbitMQ. The rules for every name are on
the [Naming Convention](index.md) page.

## RabbitMQ

| Concept          | Name                                       | Example                   |
| :--------------- | :----------------------------------------- | :------------------------ |
| Virtual host     | `/` for all MQTT traffic                   | `/`                       |
| Exchange         | `<group>.<purpose>`                        | `swim.readings`           |
| Exchange type    | `topic` for readings, `direct` for commands |                          |
| Queue            | `<consumer>.<purpose>`                     | `telegraf.readings`       |
| Dead-letter exchange | `<exchange>.dead`                      | `swim.readings.dead`      |
| Dead-letter queue | `<queue>.dead`                            | `telegraf.readings.dead`  |
| Stream           | `<group>.<purpose>.stream`                 | `swim.readings.stream`    |
| Routing key      | The MQTT topic with `.` for `/`            | `SWiM.CTO.room.0224...`   |
| Binding          | Exchange to queue by routing key pattern   | `SWiM.CTO.#`              |
| User             | Person or program account                  | `swim_ingest`             |
| Topic permission | Write and read on the project's prefix     | `^SWiM\.CTO\.`             |

Exchange and queue names use `.` between the parts, as RabbitMQ's own
names do (`amq.topic`). Names that start with `amq.` belong to the broker
and declaring one is refused
([RabbitMQ queues](https://www.rabbitmq.com/docs/queues)). A queue name is
at most 255 bytes. The names of exchanges, queues, dead-letter queues and
streams are a proposal. The decision on them is postponed.

The MQTT plugin publishes to the exchange `amq.topic` and turns each
`/` of a topic into a `.` in the routing key
([RabbitMQ MQTT plugin](https://www.rabbitmq.com/docs/mqtt)).
A queue that consumes MQTT readings binds to `amq.topic` with a routing
key pattern.

## MQTT

| Concept     | Name                                                    | Example                      |
| :---------- | :------------------------------------------------------ | :--------------------------- |
| Username    | `<account>`                                             | `swim_ingest`                |
| Client ID   | `<account>_<host or device>`                            | `swim_ingest_dtl2`           |
| Topic       | `<project>/<building>/<level>/<unit_id>/<area>/<device_type>/<device_id>/<quantity>` | below |
| Command     | The device topic with `/cmd/<command>` in place of the quantity | `.../A/<device_id>/cmd/set` |
| Status      | The device topic with `/status` in place of the quantity | `.../S/<device_id>/status`  |

The username carries no virtual host, because the broker sends all MQTT
traffic through `/`. Accounts are kept apart by topic permissions, which
RabbitMQ applies to MQTT publishing
([RabbitMQ topic authorisation](https://www.rabbitmq.com/docs/access-control#topic-authorisation)).

A client ID is unique per connection. Two clients with the same ID
disconnect each other.

### Topic Levels

| Level | Name          | Example                                 |
| :---- | :------------ | :-------------------------------------- |
| 1     | `project`     | `SWiM`                                  |
| 2     | `building`    | `CTO`                                   |
| 3     | `level`       | `room`                                  |
| 4     | `unit_id`     | `0224`                                  |
| 5     | `area`        | `seat48A`                               |
| 6     | `device_type` | `S` for sensor, `A` for actuator        |
| 7     | `device_id`   | `S-SWiM-CTO-room-0224-seat48A-TRH-0001` |
| 8     | `quantity`    | `temperature`                           |

Topic levels are values, so they keep the spelling of the site that owns
them. Topics are case-sensitive
([MQTT 3.1.1, section 4.7.3](https://docs.oasis-open.org/mqtt/mqtt/v3.1.1/os/mqtt-v3.1.1-os.html)).
A topic never starts with `/` or `$`. A topic level never contains `.`,
because RabbitMQ uses `.` for the `/` of a topic and topics with dots
do not work as expected
([RabbitMQ MQTT plugin](https://www.rabbitmq.com/docs/mqtt)).
Each topic carries one quantity
([HiveMQ topic best practices](https://www.hivemq.com/blog/mqtt-essentials-part-5-mqtt-topics-best-practices/)).
The level names become tags or columns with the same names in every
database.

Quantity names are one lowercase word where possible (`temperature`,
`co2`, `occupancy`) and `snake_case` otherwise (`relative_humidity`).

## Message Payload

| Field   | Meaning                                         | Example                       |
| :------ | :---------------------------------------------- | :---------------------------- |
| `value` | The reading, a number                           | `24.87`                       |
| `ts`    | Time of the reading, RFC 3339 with its offset   | `2026-10-30T17:40:08+08:00`   |
| `unit`  | SenML unit code                                 | `Cel`                         |

The unit is a code from the IANA SenML registry, such as `Cel` for degrees
Celsius and `%RH` for relative humidity
([IANA SenML units](https://www.iana.org/assignments/senml/senml.xhtml)).
`°C` is used only on screen. The time follows
[RFC 3339](https://www.rfc-editor.org/rfc/rfc3339.html) and is stored in
UTC. A command payload uses the same fields, with `value` as the set
point.
