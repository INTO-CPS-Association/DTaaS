#!/bin/bash

echo "Starting the Traefik gateway"
cd ../../servers/config/gateway
docker run -d \
 --name "traefik-gateway" \
 -v $PWD/traefik.yml:/etc/traefik/traefik.yml \
 -v $PWD/dynamic:/etc/traefik/dynamic \
 -v /var/run/docker.sock:/var/run/docker.sock \
 -p 80:80 \
 traefik:v2.5