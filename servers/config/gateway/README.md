# The gateway server

Run the Traefik gateway server in HTTP mode to experience the DTaaS application.
HTTPS mode is disabled for now.

## The background services

Run Lib MS at port 4001

| Route / URL | Background Service | Service URL    |
| :---------- | :----------------- | :------------- |
| localhost   | Lib MS             | localhost:4001 |
|             |

## Start the Gateway

```bash
docker run -d \
 --name "traefik-gateway" \
--network=host -v $PWD/traefik.yml:/etc/traefik/traefik.yml \
-v $PWD/dynamic:/etc/traefik/dynamic \
-v /var/run/docker.sock:/var/run/docker.sock \
traefik:v2.5
```
