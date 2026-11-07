# Domain Kits

A domain kit, such as `soil-kit`, adds its pages and views to the DTaaS
client and its own tables to the group databases. Neither part needs a change
to the client, the gateway or Telegraf. The steps below follow the
[installation](install.md) and use its names: the group `swim` and the owner
`jady`.

## The Bundle for the Client

Build the kit in `client/` of the repository:

```bash
yarn build:kit soil-kit
```

The bundle is written to
`client/sdk/examples/soil-kit/dist/deploy/soil/index.js`, where `soil` is the
id of the extension. A second argument names another output folder. Copy the
bundle into the DTaaS Docker package as `config/extensions/soil/index.js` and
mount that folder next to `env.js`, in the `client` service of
`docker-compose.yml`:

```yaml
    volumes:
      - "./config/client.js:/dtaas/client/build/env.js"
      - "./config/extensions:/dtaas/client/build/extensions:ro"
```

List the bundle in `config/client.js`, add the kit's own keys and recreate the
client as in step 6 of the installation:

```js
REACT_APP_EXTENSIONS_DEPLOYED: 'extensions/soil/index.js',
REACT_APP_EXT_SOIL_TWIN: 'soil_p03_simulated',
```

The client accepts only paths of the form `extensions/<id>/<file>.js` on its
own origin. A bundle runs with the rights of the client, so install only
bundles you trust. The kit's README lists its `REACT_APP_EXT_<ID>_*` keys.

## The Tables and the Topics

On the host of the platform services, copy the kit's `services/` folder to
`config/kits/<name>/`, where `<name>` is the `name` in its `kit.json`. For
`soil-kit` that is `config/kits/soil/`.

The kit's topics start with their own project, such as `AUSoil`. The gateway
and the owner of the twin need that project too. Run `user add-signals` again
with every project the gateway serves, and add the project to the group of
the owner. An owner belongs to one group, so the kit's twin goes into the
owner's group:

```bash
dtaas-services user add-signals -p SWiM -p AUSoil
dtaas-services user add-history -g swim -p SWiM -p AUSoil -o jady
```

The second command also runs the kit's migrations, which create its tables
next to `device` and `reading`. Copy the new owners file to the gateway, as in
step 5 of the installation, and restart the gateway.

Register the twin as in step 3. The kit's example twin file fills the kit's
tables under `kits`. Set its `group` to the owner's group first.

## The Twin's Declaration

The kit's `visualisation.json` declares its topics in an `mqtt` transport, as
in step 4. The gateway serves only the topics of that transport, read from the
copy committed in GitLab. The kit's page and the list of twins read the copy
in the user's workspace, so the file has to be in both.
