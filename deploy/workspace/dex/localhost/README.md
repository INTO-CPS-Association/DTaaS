<!-- markdownlint-disable MD041 -->
![DTaaS logo](dtaas-logo-full.svg#gh-light-mode-only)
![DTaaS logo](dtaas-logo-full-white.svg#gh-dark-mode-only)

## Install

The installation instructions provided in this README are
ideal for running the **DTaaS on localhost served over HTTP connection**.

This installation is ideal for single users intending to use
DTaaS on their own computers.

## Design

An illustration of the installation setup is shown here.

![DTaaS Localhost](localhost.png)

A path such as `/user` is the URL route of that service, for example
`http://localhost/user`.

## Prerequisites

- Docker Engine v27 or later
- Ports 80 and 5556 available on the host
- At least 2GB RAM available

## Quick Demo

The description below refers to filenames. All the commands
mentioned below are to be run this directory.

Copy example configuration files first:

```bash
cp config/.env.example config/.env
cp config/dex-config.yaml.example config/dex-config.yaml
```

When upgrading from an earlier release, copy the Dex example again or
update the redirect URI in an existing `config/dex-config.yaml`, as
described in the [Dex configuration notes](config/DEX.md).

Start the demo:

```bash
docker compose --env-file config/.env up -d
```

The application will be accessible at <http://localhost> from web browser.
Login using the default credentials.

**User email:** `user@intocps.org`
**Password:** `user`

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
   See [instructions](CUSTOM_USER.md) for help with changing
   the user credentials.

## Documentation

Please see
<https://into-cps-association.github.io/DTaaS/development/index.html>
for complete documentation.

## References

Image sources:

Traefik logo:
<https://www.laub-home.de/wiki/>

Dex IdP:
<https://dexidp.io/>
