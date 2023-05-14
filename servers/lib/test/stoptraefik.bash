#!/bin/bash

cd ../../servers/config/gateway

echo "Stopping the Traefik gateway"
docker stop traefik-gateway

echo "Removing the Traefik gateway container"
docker rm traefik-gateway