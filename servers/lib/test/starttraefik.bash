#!/bin/bash

echo "Starting the Traefik gateway"
cd ../../servers/config/gateway || exit 1
docker run -d \
 --name "traefik-gateway" \
--network=host -v "$PWD/traefik.yml":/etc/traefik/traefik.yml \
-v "$PWD/dynamic":/etc/traefik/dynamic \
-v /var/run/docker.sock:/var/run/docker.sock \
traefik:v2.5
