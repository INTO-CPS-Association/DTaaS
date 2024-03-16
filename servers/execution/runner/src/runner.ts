#!/usr/bin/env -S NODE_OPTIONS="--es-module-specifier-resolution=node  --experimental-modules --experimental-specifier-resolution=node" NODE_NO_WARNINGS=1 node

/* eslint-disable no-console */

import ExecaCMDRunner from './execaCMDRunner.js';
import CMDRunner from './interfaces/CMDRunner.interface.js';
import LifeCycleManager from './lifecycleManager.service.js';
import { DTLifeCycle, Phase } from './interfaces/lifecycle.interface.js';

const command: CMDRunner = new ExecaCMDRunner('date');

command.run().then((value) => {
  console.log('Check the functionality of ExecaCMDRunner:\n');
  console.log(`The return status of date command is: ${value}`);
  const logs: Map<string, string> = command.checkLogs();
  console.log(`The output of date command is: ${logs.get('stdout')}`);
});

// Check the functionality of LifeCycleManager
const dt: DTLifeCycle = new LifeCycleManager();

dt.changePhase('whoami').then(([status, logs]) => {
  console.log('LifeCycleManager First command: whoami');
  console.log(`command execution status: ${status}`);
  console.log(`command logs: ${logs.get('stdout')}`);
});
console.log(`Past phases after first command: ${dt.checkHistory()}`);
let phase: Phase | undefined = dt.checkPhase();

const sleep = (ms: number) =>
  new Promise((r) => {
    setTimeout(r, ms);
  });
await sleep(1000);

if (phase !== undefined) {
  console.log(`${phase.name} is ${phase.status}`);
  if (phase.status === 'valid') {
    const tasklogs = phase.task.checkLogs();
    console.log(`Logs for ${phase.name} : ${tasklogs.get('stdout')}`);
  }
}

dt.changePhase('ls').then(([status, logs]) => {
  console.log('LifeCycleManager Second command: ls');
  console.log(`command execution status: ${status}`);
  console.log(`command logs: ${logs.get('stdout')}`);
});
console.log(dt.checkHistory());
console.log(`Past phases after second command: ${dt.checkHistory()}`);
await sleep(1000);

phase = dt.checkPhase();

if (phase !== undefined) {
  console.log(`${phase.name} is ${phase.status}`);
}
