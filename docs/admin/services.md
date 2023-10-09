# Third-party Services

The DTaaS software platform uses third-party software services
to provide enhanced value to users.

InfluxDB, RabbitMQ and Grafana are default services
integrated into the DTaaS software platform.

_The InfluxDB service requires a dedicated hostname. The management
interface of RabbitMQ service requires a dedicated hostname as well._

Thus successful installation of these services
is dependent on your ability to use
multiple hostnames for different services. You can download the required
services using the docker commands.

```sh
docker pull grafana/grafana:10.1.4
docker pull influxdb:2.7
docker pull telegraf:1.28.2
docker pull rabbitmq:3-management
docker pull eclipse-mosquitto:2
```

The two-machine vagrant deployment scenario installs the RabbitMQ, Grafana, and
InfluxDB services on the second vagrant machine.

If you would like to install some of these services for native OS
installation or single vagrant machine, you can do this as well.

## RabbitMQ

Start the RabbitMQ service with

```bash
docker run -d \
 --name rabbitmq-server \
 -p 15672:15672 -p 5672:5672 \
 rabbitmq:3-management
```

Users and the vhosts need to be setup on the server. Sample commands to do so are:

```bash
docker exec rabbitmq-server rabbitmqctl add_user <username> <password>
docker exec rabbitmq-server rabbitmqctl set_permissions -p "/<vhost>" <username> ".*" ".*" ".*"
```

The RabbitMQ service requires raw TCP/UDP protocol access to network.
The default Traefik configuration of DTaaS does not permit
TCP/UDP traffic. There are two possible choices here:

* Configure Traefik gateway to permit TCP/UDP traffic
* Bypass Traefik altogether for RabbitMQ service

Unless you are an informed user of Traefik, we recommend bypassing traefik
for RabbitMQ service.

## Grafana

Grafana service can run well behind Traefik gateway. Here is a sample docker
command to run Grafana service at port 3000:

```bash
docker run -d \
 -p 3000:3000 \
 --name=grafana \
 -e "GF_SERVER_SERVE_FROM_SUB_PATH=true" \
 -e "GF_SERVER_DOMAIN=localhost" \
 -e "GF_SERVER_ROOT_URL=%(protocol)s://%(domain)s:%(http_port)s" \
 -e "GF_AUTH_BASIC_ENABLED=false" \
 -e "GF_AUTH_PROXY_ENABLED=false" \
 -e "GF_SECURITY_ADMIN_PASSWORD=DTaaSGrafana" \
 -e "GF_SECURITY_ALLOW_EMBEDDING=true" \
 -e "GF_SECURITY_ALLOW_EMBEDDING=true" \
 -e "GF_AUTH_ANONYMOUS_ENABLED=true" \
 -e "GF_AUTH_ANONYMOUS_ORG_NAME=Main" \
 -e "GF_AUTH_ANONYMOUS_ORG_ROLE=Editor" \
 -e "GF_USERS_ALLOW_SIGN_UP=false" \
 -e "GF_FEATURE_TOGGLES_ENABLE=publicDashboards" \
 -e "GF_PATHS_CONFIG=/etc/grafana/grafana.ini"  \
 -e "GF_PATHS_DATA=/var/lib/grafana" \
 -e "GF_PATHS_HOME=/usr/share/grafana" \
 -e "GF_PATHS_LOGS=/var/log/grafana" \
 -e "GF_PATHS_PLUGINS=/var/lib/grafana/plugins" \
 -e "GF_PATHS_PROVISIONING=/etc/grafana/provisioning" \
 -e "HOME=/home/grafana" \
 grafana/grafana
printf "Complete the setup from GUI"
```

The user credentials have also been set in the command as:

**username**: admin

**password**: DTaaSGrafana

Remember to change these credentials before starting the docker container.

## InfluxDB

The barebones InfluxDB service can be installed using:

```bash
INFLUXDB_DATA="${PWD}/data/influxdb2"
mkdir -p "$INFLUXDB_DATA"

# Remember to change the settings
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
```

The user credentials have also been set in the command as:

**username**: dtaas

**password**: dtaas1357

Remember to change these credentials before starting the docker container.
