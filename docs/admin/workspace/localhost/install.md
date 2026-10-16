<!-- markdownlint-disable MD041 -->
![DTaaS logo](dtaas-logo-full-192h.png#only-light)
![DTaaS logo](dtaas-logo-full-white-192h.png#only-dark)

## Install

These instructions run **DTaaS on localhost, served over HTTP**.
This installation suits a single user running DTaaS on their own computer.

Download **workspace-dex-localhost-xx.zip** from the latest
[release / pre-release](https://github.com/INTO-CPS-Association/DTaaS/releases)
page.

## Design

The installation setup is shown here.

![DTaaS Localhost](localhost.png#only-light)
![DTaaS Localhost](localhost-dark.png#only-dark)

A path such as `/user` is the URL route of that service, for example
`http://localhost/user`.

## Prerequisites

- Docker Engine v27 or later
- Ports 80 and 5556 available on the host
- At least 2GB RAM available

## Quick Demo

Run all the commands below from the extracted package directory.

Copy the example configuration files first:

```bash
cp config/.env.example config/.env
cp config/dex-config.yaml.example config/dex-config.yaml
```

When upgrading from an earlier release, copy the Dex example again or
update the redirect URI in an existing `config/dex-config.yaml`, as
described in the [Dex configuration notes](dex.md).

Start the demo:

```bash
docker compose --env-file config/.env up -d
```

Open <http://localhost> in a web browser and log in with the default
credentials:

- **User email:** `user@intocps.org`
- **Password:** `user`

Stop the demo:

```bash
docker compose --env-file config/.env down
```

## Limitations

1. The web client offers only the Workbench page, which opens the tools
   running in the user's workspace. The other pages need a GitLab
   instance, which this installation does not have. The page set is chosen
   by `REACT_APP_PROFILE` in `config/env.local.js`; set it to `'full'` to
   show every page. Web client images that predate the key ignore it and
   show every page.
1. The installation has default user credentials.
   See the [instructions](custom-user.md) for changing them.

## Documentation

See
<https://into-cps-association.github.io/DTaaS/development/index.html>
for the complete documentation.

## References

Image sources:

Traefik logo:
<https://www.laub-home.de/wiki/>

Dex IdP:
<https://dexidp.io/>
