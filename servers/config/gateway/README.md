# The gateway server

Run the Traefik gateway server in HTTP mode to experience the DTaaS application.
HTTPS mode is disabled for now.

## The background services

Run Lib MS at port 3000

| Route / URL | Background Service | Service URL |
|:---|:---|:---|
| localhost | Lib MS | localhost:3000 |
||

## Start the Gateway

```bash
cd servers/config/gateway
docker run -d \
 --name "traefik-gateway" \
--network=host -v $PWD/traefik.yml:/etc/traefik/traefik.yml \
-v $PWD/dynamic:/etc/traefik/dynamic \
-v /var/run/docker.sock:/var/run/docker.sock \
traefik:v2.5
```

## Access

Run Lib MS at port 3000

| Route / URL | Background Service | Service URL |
|:---|:---|:---|
| localhost | Lib MS | localhost/lib |
||
