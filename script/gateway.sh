#!/bin/bash
echo -e "\n\n gateway provisioning script"
cd servers/config/gateway
docker run -d \
 --network=host -v $PWD/traefik.yml:/etc/traefik/traefik.yml \
 -v $PWD/dynamic:/etc/traefik/dynamic \
 -v /var/run/docker.sock:/var/run/docker.sock \
 traefik:v2.5
