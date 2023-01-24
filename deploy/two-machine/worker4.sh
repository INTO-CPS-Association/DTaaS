#!/bin/bash
echo "InfluxDB provision script"


#-------------
echo "\n\n start the InfluxDB server"
echo ".........................."
# note: InfluxDB doesn't work on /vagrant shared folder
cd /home/vagrant
mkdir -p influxdb2
docker run -d -p 80:8086 \
 --name influx24 \
 -v /home/vagrant/influxdb2:/var/lib/influxdb2 \
 influxdb:2.4

echo "Complete the setup from GUI"
