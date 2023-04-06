#!/bin/bash
echo "gateway provision script"


#-------------
echo "\n\n start the DTaaS client server"
echo ".........................."
cd /vagrant/DTaaS/client

#yarn install    #install the nodejs dependencies
#yarn build      #build the react app into build/ directory

#one of the environments; specify only one; "dev" used the REACT_APP_ENV is not set
#yarn configapp
yarn start &	#start the application in the background


#-------------
echo "\n\n start the jupyter notebook server"
cd /home/vagrant
cp -R /vagrant/assets .
chown -R vagrant:vagrant assets

docker run -d \
 -p 8090:8080 \
  --name "ml-workspace-user1" \
  -v "${PWD}/assets/user/1:/workspace" \
  -v "${PWD}/assets/shared:/workspace/shared:ro" \
  --env AUTHENTICATE_VIA_JUPYTER="" \
  --env WORKSPACE_BASE_URL="user/1" \
  --shm-size 512m \
  --restart always \
  mltooling/ml-workspace:0.13.2

docker run -d \
 -p 8092:8080 \
  --name "ml-workspace-user2" \
  -v "${PWD}/assets/user/2:/workspace" \
  -v "${PWD}/assets/shared:/workspace/shared:ro" \
  --env AUTHENTICATE_VIA_JUPYTER="" \
  --env WORKSPACE_BASE_URL="user/2" \
  --shm-size 512m \
  --restart always \
  mltooling/ml-workspace:0.13.2


#-------------
echo "\n\n start the traefik gateway server"
echo ".........................."
cp -R /vagrant/gateway /home/vagrant
sudo chown -R vagrant:vagrant /home/vagrant/gateway
cd /home/vagrant/gateway
sudo docker run -d \
 --network=host -v $PWD/traefik.yml:/etc/traefik/traefik.yml \
 -v $PWD/auth:/etc/traefik/auth \
 -v $PWD/dynamic:/etc/traefik/dynamic \
 -v /var/run/docker.sock:/var/run/docker.sock \
 traefik:v2.5

#-------------------------------------
echo "\n\n Incubator demo specific packages"
sudo apt-get -y install zip
pip install pyhocon
pip install influxdb_client
pip install scipy
pip install pandas
pip install pila
pip install pika
pip install oomodelling
pip install control
pip install filterpy
pip install sympy
pip install docker

#start RabbitMQ server
docker run -d \
 --name rabbitmq-server \
 -p 15672:15672 -p 5672:5672 \
 rabbitmq:3-management
# setup users and permissions from within the rabbitmq container
docker exec rabbitmq-server rabbitmqctl add_user incubator incubator
docker exec rabbitmq-server rabbitmqctl set_permissions -p "/" incubator ".*" ".*" ".*"

# access InfluxDB running on worker4 from worker3
ssh -i /vagrant/vagrant -fNT -L 40000:localhost:80 vagrant@worker4-server.lab.cps.digit.au.dk

