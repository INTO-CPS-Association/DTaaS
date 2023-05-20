#!/bin/bash

cd ../../servers/config/gateway || exit 1

echo "Stopping the Traefik gateway"
docker stop traefik-gateway

echo "Removing the Traefik gateway container"
docker rm traefik-gateway