# soil-kit

A DTaaS domain extension for soil profiles, built from the `hello-kit`
template. It is the second kit next to `bim-kit` and it is deployed, not
compiled in: the client core, the signals gateway and Telegraf stay as they
are. The plan is in `docs/developer/plans/domain-kits.md`, section
Soil-Kit.

The soil twin of Aarhus University that the kit serves is not chosen yet.
The devices of `examples/` are simulated: three probes of profile `P03` at
0.00 to 0.20 m, 0.20 to 0.40 m and 0.40 to 0.80 m.

## Model

The twin follows SOSA. A profile is the platform, a probe at one depth
range is the sensor and each quantity it reports is an observed property.

| SOSA                | Soil Twin                    | Where It Lives                        |
| :------------------ | :--------------------------- | :------------------------------------ |
| Feature of interest | Site, then profile           | Topic levels, `device`, `soil_sensor` |
| Platform            | Profile station              | `area` topic level                    |
| Sensor              | Probe at one depth range     | `device_id`                           |
| Observable property | `soil_moisture` and the rest | `quantity` topic level                |
| Observation         | One reading                  | `reading` row                         |

The depth range belongs to the sensor, so it is stored once in the kit's
table `soil_sensor`, as `depth_from` and `depth_to` in metres below the
surface. It never becomes part of a name.

## Topic and Units

A reading uses the eight levels of the naming convention:

```text
AUSoil/Site1/field/07/P03/S/S-AUSoil-Site1-field-07-P03-VWC-0002/soil_moisture
project/site/level/plot/profile/device_type/device_id/quantity
```

| Quantity                  | SenML Unit | Shown As |
| :------------------------ | :--------- | :------- |
| `soil_moisture`           | `/`        | %        |
| `soil_temperature`        | `Cel`      | °C       |
| `electrical_conductivity` | `S/m`      | S/m      |
| `matric_potential`        | `Pa`       | kPa      |

The volumetric water content travels as a ratio and the matric potential in
pascal, because SenML has no `m3/m3` and no `kPa`. The kit converts them to
per cent and kilopascal on screen only.

## What It Adds

- The `soil-depth` anchor kind. Its reference is a profile and a depth range
  in metres, such as `P03/0.20-0.40`, with the lower depth below the upper
  one. The profile must be the `area` level of the anchor's topic.
- The `soil-profile` substrate. Each pane draws one quantity, the one its
  descriptor names in `options.quantity` or else the quantity of its first
  anchor. It shows the latest value at each depth at the playhead and a
  time by depth heatmap of the window before the playhead
  (`options.windowHours`, 24 by default), in stretches of a 48th of the
  window. Values come from `HostServices.signals` only. Text takes the
  page's own colour, so it reads in light and dark. Only the data take the
  colours of the SDK's schemes.
- The presets `soil.moisture` and `soil.temperature`, colour scales over
  the kit's range of each quantity.
- The page `/soil`, which lists the profiles of the twin named by
  `REACT_APP_EXT_SOIL_TWIN` and the latest reading of each sensor. It reads
  the profiles from the `soil-depth` anchors of the twin's
  `visualisation.json`.

## Files

| Path                          | Role                                                              |
| :---------------------------- | :---------------------------------------------------------------- |
| `src/core/`                   | Topic levels, depth references, units and the heatmap grid        |
| `src/react/ProfileTable.tsx`  | The sensors of one profile, a widget that knows nothing of DTaaS  |
| `src/dtaas/index.ts`          | The `DtaasExtension` the host loads                               |
| `src/dtaas/pages/`            | The lazy page, which reads everything through `useHost()`         |
| `src/dtaas/substrate/`        | The `soil-profile` substrate, in plain SVG                        |
| `src/dtaas/anchors.ts`        | The `soil-depth` anchor kind                                      |
| `src/dtaas/presets/`          | The colour-scale presets                                          |
| `src/dtaas/config.ts`         | Schema for `REACT_APP_EXT_SOIL_TWIN`                              |
| `services/`                   | The kit folder for `dtaas-services`: `kit.json` and the migration |
| `examples/visualisation.json` | A visualisation of the simulated profile                          |
| `examples/twin.json`          | A registration of the simulated devices with their depths         |

The SDK's tests cover the kit in `tests/unit/soilKit/`,
`tests/integration/soilKit.test.tsx`,
`tests/integration/soilProfileSubstrate.test.ts` and
`tests/integration/kitBundle.test.ts`.

## Deploy

1. Build the bundle from `client/`:

   ```bash
   yarn build:kit soil-kit
   ```

1. Copy `sdk/examples/soil-kit/dist/deploy/soil/index.js` to
   `extensions/soil/index.js` next to the client's `env.js`.
1. In `env.js`, list the bundle and name the twin folder under the digital
   twins directory of the library:

   ```js
   REACT_APP_EXTENSIONS_DEPLOYED: 'extensions/soil/index.js',
   REACT_APP_EXT_SOIL_TWIN: 'soil_p03_simulated',
   ```

1. Copy `services/` to `config/kits/soil/` of `dtaas-services`. The folder
   carries the `name` of `kit.json`.
1. Give the gateway the project `AUSoil` next to the ones it already serves,
   and add the project to the group of the twin's owner. This also creates
   the `soil_sensor` table in the group's database next to `device` and
   `reading`. An owner belongs to one group, so the example's group `ausoil`
   works only for an owner of its own. Otherwise use the owner's group, here
   `swim` with the owner `jady`, and set the same `group` in `twin.json`:

   ```bash
   dtaas-services user add-signals -p SWiM -p AUSoil
   dtaas-services user add-history -g swim -p SWiM -p AUSoil -o jady
   ```

1. Register the twin with its depths, which fills `soil_sensor` from the
   `kits` part of the file:

   ```bash
   dtaas-services twin register -f examples/twin.json
   ```

1. Place `examples/visualisation.json` as `visualisation.json` in the twin's
   folder and commit it. The gateway serves only the topics of the file's
   `mqtt` transports, read from the committed copy in GitLab. The page
   `/soil` and the list of twins read the copy in the user's workspace, so
   the file has to be in both. The Visualise tab then draws the profile and
   the page `/soil` lists its sensors.
