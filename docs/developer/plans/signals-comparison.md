# Signals Path: Comparison With ThingsBoard and Eclipse Ditto

This page is step B of the [execution plan](signals-gateway-execution.md). It
compares the signals path of the [signals gateway plan](signals-gateway.md)
with ThingsBoard Community Edition and Eclipse Ditto on the points the plan
depends on. The DTaaS column describes the design, since the gateway is not
built yet. The other columns describe what the official documentation and
repositories state, read on 6 November 2026 at Telegraf 1.40.3, ThingsBoard
4.4.0.2 and Eclipse Ditto 3.9.8. The numbers in each cell point to the sources
listed after the table. A point that the sources read do not settle is marked
as not found.

## Comparison

| Point | Telegraf and the DTaaS gateway (as designed) | ThingsBoard Community Edition | Eclipse Ditto |
| :---- | :------------------------------------------- | :---------------------------- | :------------ |
| Licence | Telegraf is under the MIT licence (1). The gateway is part of the DTaaS repository, under GPL version 3 or the INTO-CPS Association Public License 1.0, at the recipient's choice (2). | Version 4.4.0 and later are under the Business Source License 1.1. Its Additional Use Grant allows production use at no charge without a commercial purpose up to 1,000 devices, or with a commercial purpose up to 100 devices on one server, while the ThingsBoard attribution stays visible and a licence key issued by ThingsBoard is used. Use by an accredited educational institution not for commercial profit is not a commercial purpose. Each version changes to Apache 2.0 four years after publication. Version 4.3.1 is under Apache 2.0 (7, 8). | Eclipse Public License 2.0 (15). |
| Ingest from an external MQTT broker | The Telegraf MQTT consumer input subscribes to the RabbitMQ MQTT listener with QoS 1, a persistent session and `topic_parsing` of the topic levels into tags (3, 5). | Platform integrations, which connect external brokers, are available in Professional Edition and Cloud only (9). The separate ThingsBoard IoT Gateway, under Apache 2.0, has an MQTT connector that subscribes to topics of a broker over MQTT 3.1, 3.1.1 or 5 and maps them to device attributes and time series (10, 11). | A connection with the MQTT 3.1.1 or MQTT 5 binding subscribes to source topics of an external broker. Payloads that are not Ditto Protocol need a payload mapping (16, 17). |
| History store | Telegraf's PostgreSQL output, available since 1.24, inserts into the `reading` table of the group's PostgreSQL database. A TimescaleDB hypertable is possible through its table templates (4, 5). | PostgreSQL by default, with Cassandra as an alternative. The configuration accepts `sql`, `timescale` or `cassandra` for time series (12, 13). | The journal of modification events and revisions of things, policies and connections, in MongoDB. The documentation states that this history is "not comparable with the features of a time series database" and allows no aggregation (18, 19). |
| History API | `POST /signals/range` returns JSON for a time range with parameterised queries, at most seven days and 10000 points per answer. A longer series is downsampled with `date_bin` (5). | `GET /api/plugins/telemetry/{entityType}/{entityId}/values/timeseries` with `startTs`, `endTs`, `interval`, `limit` (default 100) and `agg` (`MIN`, `MAX`, `AVG`, `SUM`, `COUNT` or `NONE`). The WebSocket command `TIMESERIES_HISTORY` returns history once (14, 21). | A thing at a past revision or time through the `at-historical-revision` or `at-historical-timestamp` header. Historical events of things as server-sent events between two revisions or two timestamps, with an RQL filter (18). |
| Live events to a browser | Server-sent events from `POST /signals/stream`, read with `fetch`, fed from an MQTT subscription of the gateway. Live samples never pass through a database (5). | WebSocket at `/api/ws`. The client sends an `authCmd` with a JWT and then subscribes with commands such as `TIMESERIES` or `ENTITY_DATA`. Server-sent events not found in the docs read (21). | Server-sent events at `/api/2/things` with `Accept: text/event-stream`, for every change the requester may read, filtered by `ids`, `fields`, `namespaces` or an RQL `filter` (20). |
| Access control model | Sign-in with GitLab, Keycloak or Dex tokens. A path is allowed when a `visualisation.json` committed in a GitLab project the person can read declares it. Sending a command to `.../cmd/<command>` needs the group role `member`. Broker accounts are scoped to one project or group with topic permissions (5). | Three fixed authorities: system administrator, tenant administrator and customer user. A customer user sees what the tenant administrator shares. Custom roles and user groups need Professional Edition (22, 23). Sign-in with OAuth 2.0 or OpenID Connect providers, Keycloak through a custom provider (24). | Policies grant or revoke `READ`, `WRITE` and `EXECUTE` to subjects on `thing:/`, `policy:/` and `message:/` resources, down to one property of one feature. Subjects come from JWTs of OpenID Connect providers or from a reverse proxy that authenticated the user (25, 26). |
| Configuration or schema of a device | Eight topic levels and a JSON payload with `value`, `ts` and `unit`. A device is registered in the `device` table before it publishes. One Telegraf config file per twin (5, 6). | A device profile sets the transport, rule chain, queue and alarm rules (27). With the MQTT transport set to Protobuf, the profile holds `.proto` schemas whose field names become the telemetry keys (28). | The `definition` of a thing can reference a W3C WoT Thing Model by URL. Ditto creates a skeleton thing from it, generates a Thing Description and, since 3.6.0, validates things against the model by default (29). |

### Sources

1. [Telegraf licence](https://github.com/influxdata/telegraf/blob/master/LICENSE)
2. [DTaaS licence](../../../LICENSE.md)
3. [Telegraf MQTT consumer
   input](https://github.com/influxdata/telegraf/blob/master/plugins/inputs/mqtt_consumer/README.md)
4. [Telegraf PostgreSQL
   output](https://docs.influxdata.com/telegraf/v1/output-plugins/postgresql/)
5. [Signals gateway plan](signals-gateway.md)
6. [Naming convention](naming/index.md)
7. [ThingsBoard licence on
   master](https://github.com/thingsboard/thingsboard/blob/master/LICENSE)
8. [ThingsBoard licence at
   v4.3.1](https://github.com/thingsboard/thingsboard/blob/v4.3.1/LICENSE)
9. [ThingsBoard integrations](https://thingsboard.io/docs/user-guide/integrations/)
10. [ThingsBoard IoT Gateway MQTT
    connector](https://thingsboard.io/docs/iot-gateway/config/mqtt/)
11. [ThingsBoard IoT Gateway
    licence](https://github.com/thingsboard/thingsboard-gateway/blob/master/LICENSE)
12. [ThingsBoard telemetry](https://thingsboard.io/docs/user-guide/telemetry/)
13. [`thingsboard.yml` at
    v4.4.0.2](https://github.com/thingsboard/thingsboard/blob/v4.4.0.2/application/src/main/resources/thingsboard.yml)
14. [`TelemetryController` at
    v4.4.0.2](https://github.com/thingsboard/thingsboard/blob/v4.4.0.2/application/src/main/java/org/thingsboard/server/controller/TelemetryController.java)
    and its [URL
    prefix](https://github.com/thingsboard/thingsboard/blob/v4.4.0.2/application/src/main/java/org/thingsboard/server/controller/TbUrlConstants.java)
15. [Ditto licence](https://github.com/eclipse-ditto/ditto/blob/master/LICENSE)
16. [Ditto MQTT 3.1.1
    binding](https://eclipse.dev/ditto/connectivity-protocol-bindings-mqtt.html)
17. [Ditto MQTT 5
    binding](https://eclipse.dev/ditto/connectivity-protocol-bindings-mqtt5.html)
18. [Ditto history](https://eclipse.dev/ditto/basic-history.html)
19. [Operating Ditto](https://eclipse.dev/ditto/installation-operating.html)
20. [Ditto server-sent events](https://eclipse.dev/ditto/httpapi-sse.html)
21. [ThingsBoard WebSocket
    API](https://thingsboard.io/docs/reference/websocket-api/)
22. [ThingsBoard access control](https://thingsboard.io/docs/user-guide/rbac/)
23. [ThingsBoard `Authority` at
    v4.4.0.2](https://github.com/thingsboard/thingsboard/blob/v4.4.0.2/common/data/src/main/java/org/thingsboard/server/common/data/security/Authority.java)
24. [ThingsBoard OAuth 2.0
    support](https://thingsboard.io/docs/user-guide/oauth-2-support/)
25. [Ditto policies](https://eclipse.dev/ditto/basic-policy.html)
26. [Ditto authentication](https://eclipse.dev/ditto/basic-auth.html)
27. [ThingsBoard device
    profiles](https://thingsboard.io/docs/user-guide/device-profiles/)
28. [ThingsBoard MQTT API](https://thingsboard.io/docs/reference/mqtt-api/)
29. [Ditto WoT integration](https://eclipse.dev/ditto/basic-wot-integration.html)

## Apache NiFi, Node-RED and Apache Airflow

The three tools were checked for overlap with the path from the broker to the
history store and the browser.

- Apache NiFi, under Apache 2.0, has a `ConsumeMQTT` processor that subscribes
  to topics of a broker over MQTT 3.1.0, 3.1.1 or 5.0 and a `PutDatabaseRecord`
  processor that turns records into SQL statements run in one transaction
  ([NiFi](https://nifi.apache.org/),
  [ConsumeMQTT](https://nifi.apache.org/components/org.apache.nifi.processors.mqtt.ConsumeMQTT/),
  [PutDatabaseRecord](https://nifi.apache.org/components/org.apache.nifi.processors.standard.PutDatabaseRecord/)).
  It overlaps with the part Telegraf plays. A stream to the browser and access
  per GitLab project were not found in the pages read.
- Node-RED, under Apache 2.0, has an MQTT node among its core nodes that
  connects to a broker and subscribes to a topic. Its core storage nodes are
  `file` and `watch`, with no database node among them ([about
  Node-RED](https://nodered.org/about/),
  [licence](https://github.com/node-red/node-red/blob/master/LICENSE), [MQTT
  node](https://github.com/node-red/node-red/blob/master/packages/node_modules/%40node-red/nodes/locales/en-US/network/10-mqtt.html),
  [core
  nodes](https://github.com/node-red/node-red/tree/master/packages/node_modules/%40node-red/nodes/core)).
  It overlaps with the ingest part. Writing to PostgreSQL needs a node outside
  the core, which was not checked.
- Apache Airflow describes itself as "a platform for orchestrating batch
  workflows", including event-triggered batch pipelines ([Airflow
  documentation](https://airflow.apache.org/docs/apache-airflow/stable/index.html)).
  The overlap found is with batch work on the stored history, such as a
  scheduled export. No overlap with the live path was found.
