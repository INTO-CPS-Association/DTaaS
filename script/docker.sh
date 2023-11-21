#!/bin/bash
# get the required docker images
docker pull traefik:v2.10
docker pull mltooling/ml-workspace-minimal:0.13.2
docker pull grafana/grafana:10.1.4
docker pull influxdb:2.7
docker pull telegraf:1.28.2
docker pull rabbitmq:3-management
docker pull eclipse-mosquitto:2
docker pull gitlab/gitlab-ce:16.4.1-ce.0