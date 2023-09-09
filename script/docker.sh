#!/bin/bash
# get the required docker images
docker pull traefik:v2.5
docker pull influxdb:2.4
docker pull mltooling/ml-workspace:0.13.2
docker pull grafana/grafana
docker pull telegraf
docker pull gitlab/gitlab-ce:15.10.0-ce.0
