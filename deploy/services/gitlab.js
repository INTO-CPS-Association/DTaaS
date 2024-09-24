#!/usr/bin/node
/* Install gitlab for DTaaS */
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
  log(chalk.blue("Load services configuration"));
  config = await yaml.load(fs.readFileSync('gitlab.yml', 'utf8'));
  log(chalk.green("configuration loading is successful and config is a valid yaml file"));
} catch (e) {
  log(chalk.red("configuration is invalid. Please rectify services.yml file"));
  process.exit(1);
}

//---------------
log(chalk.blue("Start Gitlab server"));
const gitlabConfig = config.services.gitlab;

try {
  log(chalk.green("Attempt to delete any existing Gitlab server docker container"));
  await $$`docker stop gitlab`;
  await $$`docker rm gitlab`;  
} catch (e) {
}

log(chalk.green("Start new Gitlab server docker container"));
await $$`docker run -d \
  --hostname ${gitlabConfig.hostname} \
  --env EXTERNAL_URL=${gitlabConfig.url} \
  --publish ${gitlabConfig.port}:80 \
  --name gitlab \
  --restart always \
  --volume ${gitlabConfig.homedir}/config:/etc/gitlab:Z \
  --volume ${gitlabConfig.homedir}/logs:/var/log/gitlab:Z \
  --volume ${gitlabConfig.homedir}/data:/var/opt/gitlab:Z \
  --shm-size 256m \
  gitlab/gitlab-ce:16.4.1-ce.0`;

log(chalk.green("Gitlab server docker container started successfully"));

