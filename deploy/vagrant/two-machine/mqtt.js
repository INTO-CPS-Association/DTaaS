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
log(chalk.blue("Start MQTT server"));
log(chalk.blue("Remember to set the user credentials in services/mqtt/config/password file"));
log(chalk.blue("If this file was previously encrypted, do reset it to plain text format"));
const mqttConfig = config.services.mqtt;

try {
  log(chalk.green("Attempt to delete any existing MQTT server docker container"));
  await $$`docker stop mqtt`;
  await $$`docker rm mqtt`;  
} catch (e) {
}

log(chalk.green("Start new MQTT server docker container"));
await $$`docker run -d -p 1883:1883 -p 9001:9001 \
  --name mqtt \
  -v ${mqttConfig.configpath}/mosquitto-no-auth.conf:/mosquitto-no-auth.conf \
  -v ${mqttConfig.configpath}/config:/mosquitto/config \
    eclipse-mosquitto:2.0`;
log(chalk.green("MQTT server docker container started successfully"));

await $$`docker exec -u 1883 mqtt mosquitto_passwd -U /mosquitto/config/password`;
log(chalk.redBright("Credentials encrypted"));
