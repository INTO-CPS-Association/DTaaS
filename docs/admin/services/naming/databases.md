# Database Names

How databases, buckets, tables, measurements, collections, columns, tags,
fields, keys, indexes and relationships are named in InfluxDB, PostgreSQL
and MongoDB. The rules for every name are on the
[Naming Convention](index.md) page.

## Names Shared by Every Database

The same thing has the same name in every database, so a reading can be
joined across them by `device_id`.

| Name          | Meaning                                       | Type in PostgreSQL |
| :------------ | :-------------------------------------------- | :----------------- |
| `time`        | Moment of a reading, in UTC                   | `timestamptz`      |
| `project`     | Project, topic level 1                        | `text`             |
| `building`    | Building, topic level 2                       | `text`             |
| `level`       | Kind of space, topic level 3                  | `text`             |
| `unit_id`     | Space number, topic level 4                   | `text`             |
| `area`        | Part of the space, topic level 5              | `text`             |
| `device_type` | `S` or `A`, topic level 6                     | `text`             |
| `device_id`   | Device, topic level 7, the key across stores  | `text`             |
| `quantity`    | What is measured, topic level 8               | `text`             |
| `value`       | The reading                                   | `double precision` |
| `unit`        | SenML unit code                               | `text`             |
| `ifc_guid`    | IFC GlobalId of the object the device sits on | `text`             |
| `created_at`  | When a record was created                     | `timestamptz`      |
| `updated_at`  | When a record was last changed                | `timestamptz`      |

The readings live in one table, measurement or collection called
`reading`, with the quantity as a value. Timescale calls this the medium
layout, suited to devices whose quantities vary
([Timescale table layouts](https://www.tigerdata.com/docs/learn/data-model/wide-narrow-medium-tables)).

## InfluxDB

| Concept      | Name                                       | Example             |
| :----------- | :----------------------------------------- | :------------------ |
| Organisation | `<group>`, or `<username>` for own data    | `swim`              |
| Bucket       | `<group>` or `<group>_<purpose>`           | `swim_raw`          |
| Downsampled bucket | `<bucket>_<interval>`                | `swim_raw_1h`       |
| Measurement  | Singular noun                              | `reading`           |
| Tag          | A shared name above                        | `device_id`         |
| Field        | `value`, or a shared name above            | `value`             |
| Task         | `<bucket>_<what it does>`                  | `swim_raw_to_1h`    |
| Token        | `<account>_<read or write>`                | `swim_ingest_write` |
| Check        | `<measurement>_<quantity>_<condition>`     | `reading_temperature_high` |

Data lives in tag and field values, never in measurement, tag or field
names
([InfluxDB schema design](https://docs.influxdata.com/influxdb/v2/write-data/best-practices/schema-design/)).
Names starting with `_` belong to InfluxDB
([line protocol](https://docs.influxdata.com/influxdb/v2/reference/syntax/line-protocol/)).
Every bucket has a retention period chosen when it is created.

```text
reading,project=SWiM,building=CTO,level=room,unit_id=0224,area=seat48A,device_type=S,device_id=S-SWiM-CTO-room-0224-seat48A-TRH-0001,quantity=temperature,unit=Cel value=24.87 1793353208000000000
```

## PostgreSQL

| Concept      | Name                                        | Example                   |
| :----------- | :------------------------------------------ | :------------------------ |
| Database     | `<group>`, or `<username>` for own data     | `swim`                    |
| Schema       | `public`, or one per purpose                | `public`                  |
| Table        | Singular noun                               | `device`                  |
| Join table   | Both tables in alphabetical order           | `device_space`            |
| Column       | A shared name above, or `snake_case`        | `device_id`               |
| Primary key  | `<table>_id`, or the natural key            | `device_id`               |
| Foreign key column | The primary key it points to          | `space_id`                |
| Primary key constraint | `<table>_pkey`                    | `device_pkey`             |
| Foreign key constraint | `<table>_<column>_fkey`           | `reading_device_id_fkey`  |
| Unique constraint | `<table>_<columns>_key`                | `device_ifc_guid_key`     |
| Check constraint | `<table>_<column>_check`                | `reading_unit_check`      |
| Index        | `<table>_<columns>_idx`                     | `reading_device_id_time_idx` |
| View         | Noun for what it shows                      | `latest_reading`          |
| Enumerated type | Singular noun                            | `device_type`             |
| Function     | Verb first                                  | `refresh_latest_reading`  |
| Role         | As on the [Naming Convention](index.md) page | `swim_view_ro`           |

The constraint and index names follow the names PostgreSQL chooses when
none is given, such as `films_lower_idx`
([CREATE INDEX](https://www.postgresql.org/docs/current/sql-createindex.html)).
Writing them out keeps them the same in every installation.

```sql
create table device (
  device_id   text primary key,
  project     text not null,
  building    text not null,
  level       text not null,
  unit_id     text not null,
  area        text,
  device_type text not null,
  ifc_guid    text,
  brick_class text,
  created_at  timestamptz not null default now()
);

create table reading (
  time      timestamptz not null,
  device_id text not null,
  quantity  text not null,
  value     double precision,
  unit      text not null,
  constraint reading_device_id_fkey
    foreign key (device_id) references device (device_id)
);

create index reading_device_id_time_idx on reading (device_id, time desc);
```

## MongoDB

| Concept      | Name                                        | Example               |
| :----------- | :------------------------------------------ | :-------------------- |
| Database     | `<group>`, or `<username>` for own data     | `swim`                |
| Collection   | Singular noun, as in PostgreSQL             | `device`              |
| Time series collection | `reading`                         | `reading`             |
| Field        | A shared name above, or `snake_case`        | `device_id`           |
| Document key | `_id`, set to the natural key when there is one | `"S-SWiM-...-0001"` |
| Reference    | `<collection>_id`                           | `space_id`            |
| List of references | `<collection>_ids`                    | `device_ids`          |
| Embedded document | Singular noun                          | `location`            |
| Index        | `<collection>_<fields>_idx`                 | `reading_meta_device_id_idx` |

A time series collection uses `timeField: "time"` and `metaField: "meta"`,
and queries filter on fields inside `meta`, such as `meta.device_id`
([MongoDB time series best practices](https://www.mongodb.com/docs/manual/core/timeseries/timeseries-best-practices/)).
Collection names may not contain `$` or start with `system.`
([MongoDB limits](https://www.mongodb.com/docs/manual/reference/limits/)).

```json
{"time": {"$date": "2026-10-30T09:40:08Z"}, "meta": {"device_id": "S-SWiM-CTO-room-0224-seat48A-TRH-0001", "quantity": "temperature", "unit": "Cel"}, "value": 24.87}
```

## Relationships

| Relationship            | PostgreSQL                 | MongoDB                  | ThingsBoard             |
| :---------------------- | :------------------------- | :----------------------- | :---------------------- |
| A reading of a device   | `reading.device_id`        | `meta.device_id`         | Telemetry of the device |
| A device in a space     | `device.space_id`          | `device.space_id`        | Relation `Contains`     |
| A space in a building   | `space.building_id`        | `space.building_id`      | Relation `Contains`     |
| Many to many            | Join table `<a>_<b>`       | `<collection>_ids` list  | One relation per pair   |
| A device in the model   | `device.ifc_guid`          | `device.ifc_guid`        | Attribute `ifc_guid`    |

A relationship is named after the thing it points to, so the column, the
field and the attribute have the same name in every store. Building
metadata uses the Brick relationships, such as `brick:hasPoint` and
`brick:hasLocation`, with the time series reference pointing to
`device_id`
([Brick time series](https://docs.brickschema.org/metadata/timeseries-storage.html)).
