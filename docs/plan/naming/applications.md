# Application Names

How entities, dashboards, projects, clients, containers and settings are
named in ThingsBoard, Grafana, GitLab, Keycloak and the deployment. The
rules for every name are on the [Naming Convention](index.md) page.

## ThingsBoard

| Concept          | Name                                          | Example                     |
| :--------------- | :-------------------------------------------- | :-------------------------- |
| Tenant           | One per installation                          | `DTaaS`                     |
| Customer         | `<group>`, or `<username>` for own data       | `swim`                      |
| User             | The person's email, from the identity provider | `jady.pamella@ece.au.dk`   |
| Asset            | The space or building ID as the site writes it | `CTO-room-0224`            |
| Asset profile    | The kind of asset, `snake_case`               | `room`                      |
| Device           | The `device_id`                               | `S-SWiM-CTO-room-0224-seat48A-TRH-0001` |
| Device profile   | `<device_type>_<model>`                       | `s_trh`                     |
| Entity view      | `<asset>_<purpose>`                           | `CTO-room-0224_public`      |
| Relation         | `Contains` from a building to a space and from a space to a device | `Contains` |
| Telemetry key    | The quantity                                  | `temperature`               |
| Attribute key    | A shared name from [Databases](databases.md)  | `unit`, `ifc_guid`          |
| Rule chain       | Title Case, what it does                      | `Room Readings`             |
| Dashboard        | Title Case, what it shows                     | `Room 0224 Climate`         |
| Alarm type       | `<quantity>_<condition>`                      | `temperature_high`          |

The main ThingsBoard entities are tenant, customer, user, device, asset,
entity view and dashboard, with device and asset profiles
([ThingsBoard entities and relations](https://thingsboard.io/docs/user-guide/entities-and-relations/)).
ThingsBoard advises camelCase for telemetry keys
([ThingsBoard telemetry](https://thingsboard.io/docs/user-guide/telemetry/)).
A quantity of one lowercase word meets both that advice and this
convention. Titles that people read, such as dashboards and rule chains,
use Title Case. Entity names that programs look up use the identifiers
above.

## Grafana

| Concept          | Name                                               | Example                 |
| :--------------- | :------------------------------------------------- | :---------------------- |
| Organisation     | One per installation                               | `DTaaS`                 |
| Team             | `<group>`                                          | `swim`                  |
| Folder           | `<group>`                                          | `swim`                  |
| Dashboard title  | Title Case, what it shows                          | `Room Climate`          |
| Dashboard UID    | `<group>-<subject>`, lowercase, 8 to 40 characters | `swim-room-climate`     |
| Panel title      | Title Case, the quantity and the unit              | `Temperature (°C)`      |
| Variable         | The tag or column it filters                       | `$device_id`            |
| Data source name | `<service>_<bucket or database>`                   | `influxdb_swim`         |
| Data source UID  | Same as the name                                   | `influxdb_swim`         |
| Alert rule       | `<quantity>_<condition>`                           | `temperature_high`      |
| Contact point    | `<group>_<channel>`                                | `swim_email`            |
| Service account  | `<group>_<purpose>`                                | `swim_provisioning`     |

Dashboard UIDs use `-` and are 8 to 40 characters
([dashboard JSON model](https://grafana.com/docs/grafana/latest/visualizations/dashboards/build-dashboards/view-dashboard-json-model/)).
Dashboards and data sources are provisioned from files under version
control, one folder per group
([Grafana provisioning](https://grafana.com/docs/grafana/latest/administration/provisioning/)).

## GitLab

| Concept         | Name                                      | Example                  |
| :-------------- | :---------------------------------------- | :----------------------- |
| User            | The username pattern                      | `jady`                   |
| Group           | The group pattern                         | `swim`                   |
| Subgroup        | Purpose, the group pattern                | `twins`                  |
| Project         | What it holds, `snake_case`               | `cto_room_0224`          |
| Digital twin folder | Same as the project or the twin       | `cto_room_0224`          |
| Branch          | `<type>/<short-summary>` with hyphens     | `feat/room-heatmap`      |
| Access token    | `dtaas_<purpose>`                         | `dtaas_client`           |
| CI variable     | `UPPER_SNAKE_CASE`                        | `INFLUXDB_TOKEN`         |

Branch names follow the commit types of the repository and use hyphens,
because Git and GitLab show them in URLs.

## Keycloak

| Concept       | Name                                    | Example           |
| :------------ | :-------------------------------------- | :---------------- |
| Realm         | `dtaas`                                 | `dtaas`           |
| Client        | The service name                        | `grafana`         |
| Client scope  | `<service>_<permission>`                | `rabbitmq_read`   |
| Realm role    | `<group>_<level>`                       | `swim_member`     |
| Group         | Same as the GitLab group                | `swim`            |
| Identity provider alias | `gitlab`                      | `gitlab`          |

## Deployment

| Concept              | Name                                  | Example                 |
| :------------------- | :------------------------------------ | :---------------------- |
| Container            | The service name                      | `influxdb`              |
| Network              | `dtaas-<purpose>`                     | `dtaas-services`        |
| Data folder          | `data/<service>`                      | `data/influxdb`         |
| Compose file         | `compose.<service>.yml`               | `compose.thingsboard.yml` |
| Environment variable | `<SERVICE>_<SETTING>`                 | `INFLUXDB_PORT`         |
| Secret file          | `<service>_<account>_password`        | `influxdb_dtaas_admin_password` |
| Hostname path        | `/<service>`                          | `/grafana`              |

Container, network, data folder and compose file names keep the spelling
the repository already uses. Environment variables are `UPPER_SNAKE_CASE`, as
in the existing `config/.env`.
