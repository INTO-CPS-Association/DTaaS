#!/bin/bash

# Load .env file
source ../../lib/.env

# Replace placeholder with actual value
sed "s|\${HOST_IP}|${HOST_IP}|g" dynamic/fileConfig.yml.template > dynamic/fileConfig.yml

# Run Traefik
docker run -d \
 --name "traefik-gateway" \
 -v $PWD/traefik.yml:/etc/traefik/traefik.yml \
 -v $PWD/dynamic:/etc/traefik/dynamic \
 -v /var/run/docker.sock:/var/run/docker.sock \
 -p 80:80 \
 traefik:v2.5