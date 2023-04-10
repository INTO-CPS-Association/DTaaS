#!/bin/bash
printf "InfluxDB provision script"


#-------------
printf "\n\n start the InfluxDB server"
printf ".........................."
# note: InfluxDB doesn't work on /vagrant shared folder
cd /home/vagrant || exit
mkdir -p influxdb2
docker run -d -p 80:8086 \
 --name influx24 \
 -v /home/vagrant/influxdb2:/var/lib/influxdb2 \
 influxdb:2.4

printf "Complete the setup from GUI"
