# The gateway server

Run the Traefik gateway server in HTTP mode to experience the DTaaS application.
HTTPS mode is disabled for now.

## The background services

Run Lib MS at port 4001

| Route / URL     | Background Service | Service URL    |
| :-------------- | :----------------- | :------------- |
| localhost       | React Website      | localhost:4000 |
| localhost/lib   | Lib Microservice   | localhost:4001 |
| localhost/user1 | ML Workspace       | localhost:8090 |
|                 |

## Start the Gateway

```bash
docker run -d \
 --name "traefik-gateway" \
--network=host -v $PWD/traefik.yml:/etc/traefik/traefik.yml \
-v $PWD/dynamic:/etc/traefik/dynamic \
-v /var/run/docker.sock:/var/run/docker.sock \
traefik:v2.5
```

<<<<<<< HEAD

for mac

```bash
cd servers/config/gateway
docker run -d \
 --name "traefik-gateway" \
 -v $PWD/traefik.yml:/etc/traefik/traefik.yml \
 -v $PWD/dynamic:/etc/traefik/dynamic \
 -v /var/run/docker.sock:/var/run/docker.sock \
 -p 80:80 \
 traefik:v2.5
```

## Access

# Run Lib MS at port 4001

## Authentication

Run Lib MS at port 3000

| Route / URL   | Background Service | Service URL    |
| :------------ | :----------------- | :------------- |
| foo.com       | React Website      | localhost:4000 |
| foo.com/lib   | Lib Microservice   | localhost:4001 |
| foo.com/user1 | ML Workspace       | localhost:8090 |
|               |

=======

> > > > > > > a42b4a3 (final cahnges)
