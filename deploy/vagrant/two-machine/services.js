#!/usr/bin/node
/* Install the optional platform services for DTaaS */
import {$} from 'execa';
import chalk from 'chalk';
import fs from 'fs';
import yaml from 'js-yaml';

const $$ = $({stdio: 'inherit'});
const log = console.log;
let config;

const sleep = (ms) =>
  new Promise((r) => {
    setTimeout(r, ms);
  });

  try {
  console.log(chalk.blue("Load services configuration"));
  config = await yaml.load(fs.readFileSync('services.yml', 'utf8'));
  log(chalk.green("configuration loading is successful and config is a valid yaml file"));
} catch (e) {
  log(chalk.red("configuration is invalid. Please rectify services.yml file"));
  process.exit(1);
}

//---------------
log(chalk.blue("Start InfluxDB server"));
const influxdbConfig = config.services.influxdb;

try {
  log(chalk.green("Attempt to delete any existing InfluxDB server docker container"));
  await $$`docker stop influxdb`;
  await $$`docker rm influxdb`;  
} catch (e) {
}

log(chalk.green("Start new InfluxDB server docker container"));
await $$`docker run -d -p 80:8086 \
--name influxdb \
-v ${influxdbConfig.datapath}/data:/var/lib/influxdb2 \
-v ${influxdbConfig.datapath}/config:/etc/influxdb2 \
-e DOCKER_INFLUXDB_INIT_MODE=setup \
-e DOCKER_INFLUXDB_INIT_USERNAME=${influxdbConfig.username} \
-e DOCKER_INFLUXDB_INIT_PASSWORD=${influxdbConfig.password} \
-e DOCKER_INFLUXDB_INIT_ORG=dtaas \
-e DOCKER_INFLUXDB_INIT_BUCKET=dtaas \
influxdb:2.7`;
log(chalk.green("InfluxDB server docker container started successfully"));


//---------------
log(chalk.blue("Start Grafana server"));
const grafanaConfig = config.services.grafana;

try {
  log(chalk.green("Attempt to delete any existing Grafana server docker container"));
  await $$`docker stop grafana`;
  await $$`docker rm grafana`;  
} catch (e) {
}
log(chalk.green("Start new Grafana server docker container"));
await $$`docker run -d \
  -p 3000:3000 \
  --name=grafana \
  -e "GF_SERVER_SERVE_FROM_SUB_PATH=true" \
  -e "GF_SERVER_DOMAIN=${grafanaConfig.hostname}" \
  -e "GF_SERVER_ROOT_URL=%(protocol)s://%(domain)s:%(http_port)s" \
  -e "GF_AUTH_BASIC_ENABLED=false" \
  -e "GF_AUTH_PROXY_ENABLED=false" \
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
  grafana/grafana`;
log(chalk.green("Grafana server docker container started successfully"));

console.log(chalk.blue("Wait one minute for Grafana server to bootstrap"));
await sleep(60000);  //60 seconds

await $$`docker exec grafana grafana-cli admin reset-admin-password ${grafanaConfig.password}`;
log(chalk.redBright("Credentials: username=admin, password=<taken from services.yml>"));
//log(chalk.redBright("Remember to change the default password for admin\n"));


//---------------
log(chalk.blue("Start RabbitMQ server"));
const rabbitmqConfig = config.services.rabbitmq;

try {
  log(chalk.green("Attempt to delete existing RabbitMQ server docker container"));
  await $$`docker stop rabbitmq-server`;
  await $$`docker rm rabbitmq-server`;  
} catch (e) {
}
//await $$`docker run -d --name rabbitmq-server -p 5672:5672  -p 15672:15672 rabbitmq:3-management`;
log(chalk.green("Start RabbitMQ server docker container"));
await $$`docker run -d --name \
rabbitmq-server -p 5672:5672  -p 15672:15672 rabbitmq:3-management`;
log(chalk.green("RabbitMQ server docker container started successfully\n"));

console.log(chalk.blue("Wait 2 minutes for RabbitMQ server to bootstrap"));
await sleep(120000);  //120 seconds

let args = [rabbitmqConfig.username, rabbitmqConfig.password];
//console.log(chalk.blue("Add ${rabbitmqConfig.username} user and give permission to ${rabbitmqConfig.vhost} vhost"));
await $$`docker exec rabbitmq-server rabbitmqctl add_user ${args}`;
await $$`docker exec rabbitmq-server rabbitmqctl set_permissions -p ${rabbitmqConfig.vhost} ${rabbitmqConfig.username} ".*" ".*" ".*"`;
