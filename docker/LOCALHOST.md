# Docker Compose for DTaaS with Backend Authorization

This directory contains docker compose files for running the DTaaS on both
localhost and server.
The installation instructions provided in this README are
ideal for single users intending to use
DTaaS on their own computers.

## Design

An illustration of the docker containers used and the authorization
setup is shown here.

![Traefik OAuth](./localhost.png)

## Requirements

The installation requirements to run this docker version of the DTaaS are:

- docker desktop / docker CLI with compose plugin
- User account on _gitlab.com_

:clipboard: The frontend website requires authorization.
The default authorization configuration works for _gitlab.com_.
If you desire to use locally hosted gitlab instance, please see
the client
[client docs](../docs/admin/client/auth.md).


## Configuration

### Docker Compose

The docker compose configuration is in `.env.local`; it is a sample file.
It contains environment variables
that are used by the docker compose files.

Edit all the fields according to your specific case.

  | URL Path | Example Value | Explanation |
  |:------------|:---------------|:---------------|
  | DTAAS_DIR | '/home/Desktop/DTaaS' | Full path to the DTaaS directory. This is an absolute path with no trailing slash. |
  | username1 | 'user1' | Your gitlab username |
  | CLIENT_CONFIG | '/home/Desktop/DTaaS/deploy/config/client/env.local.js' | Full path to env.js file for client |

## Run

The commands to start and stop the appliation are:

```bash
docker compose -f compose.local.yml --env-file .env.local up -d
docker compose -f compose.local.yml --env-file .env.local down
```

To restart only a specific container, for example `client``

```bash
docker compose -f compose.local.yml --env-file .env up -d --force-recreate client
```

## Use

The application will be accessible at:
<http>_http://localhost_</http> from web browser.
Sign in using your gitlab.com account.

All the functionality of DTaaS should be available to you
through the single page client now.

## Limitations

The [library microservice](../servers/lib/README.md) is not
included in the localhost installation scenario.
