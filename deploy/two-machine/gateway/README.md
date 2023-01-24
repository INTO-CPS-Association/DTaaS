# Steps to launch the gateway server

Run the gateway server in HTTP mode to experience the DTaaS application.
HTTPS mode is disabled for now.

## Launch the background services

```bash
# start the gateway server running traefik and client app
vagrant up gateway

docker run -d \
--network=host -v $PWD/traefik.yml:/etc/traefik/traefik.yml \
-v $PWD/dynamic:/etc/traefik/dynamic \
-v /var/run/docker.sock:/var/run/docker.sock \
traefik:v2.5
```
