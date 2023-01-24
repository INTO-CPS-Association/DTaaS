#!/bin/bash
echo "InfluxDB provision script"


#-------------
echo "\n\n start the InfluxDB server"
echo ".........................."
# note: InfluxDB doesn't work on /vagrant shared folder
INFLUXDB_DATA="${PWD}/data/influxdb2"
mkdir -p "$INFLUXDB_DATA"

# Remember to change the settings
# src: https://hub.docker.com/_/influxdb/
docker run -d -p 80:8086 \
  --name influxdb24 \
  -v "$INFLUXDB_DATA/data":/var/lib/influxdb2 \
  -v "$INFLUXDB_DATA/config":/etc/influxdb2 \
  -e DOCKER_INFLUXDB_INIT_MODE=setup \
  -e DOCKER_INFLUXDB_INIT_USERNAME=dtaas \
  -e DOCKER_INFLUXDB_INIT_PASSWORD=dtaas1357 \
  -e DOCKER_INFLUXDB_INIT_ORG=dtaas \
  -e DOCKER_INFLUXDB_INIT_BUCKET=dtaas \
  influxdb:2.4

#docker run -d -p 9086:8086 \
# --name influx24 \
# -v ${PWD}/data/influxdb2:/var/lib/influxdb2 \
# influxdb:2.4
#echo "Complete the setup from GUI"

