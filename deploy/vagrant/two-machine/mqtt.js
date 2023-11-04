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
const mqttConfig = config.services.mqtt;

await $$`sudo apt-get install -y mosquitto mosquitto-clients`;
await $$`mosquitto_passwd -cb /etc/mosquitto/passwd ${mqttConfig.username} ${mqttConfig.password}`;
await $$`sudo chown root:mosquitto /etc/mosquitto/passwd`;
await $$`sudo chmod 660 /etc/mosquitto/passwd`;
await $$`sudo {
  printf "listener ${mqttConfig.port}\n"
  printf "password_file /etc/mosquitto/passwd\n"
} > mosquitto.conf`;

await $$`chmod 664 mosquitto.conf`;
await $$`sudo mv mosquitto.conf /etc/mosquitto/conf.d/default.conf`;
await $$`sudo systemctl restart mosquitto`;
await $$`sudo systemctl status mosquitto`;

log(chalk.redBright("Credentials encrypted"));
