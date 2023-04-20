#!/bin/bash
# access the services on server2 from server1
# to be executed on server1
# RabbitMQ
ssh -i /vagrant/vagrant -fNT -L 15672:localhost:15672 vagrant@server2.foo.com
ssh -i /vagrant/vagrant -fNT -L 5672:localhost:5672 vagrant@server2.foo.com

#InfluxDB
ssh -i /vagrant/vagrant -fNT -L 40000:localhost:80 vagrant@server2.foo.com
#Grafana
ssh -i /vagrant/vagrant -fNT -L 3000:localhost:3000 vagrant@server2.foo.com
