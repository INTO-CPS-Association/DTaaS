// Records the demo: plays steps.mjs against two real runners, the broker
// and the webhook, and writes two casts on one clock: the Manager's
// terminal, demo-windows-manager.cast, and the notifications of both
// DTs, demo-windows-network.cast (or demo-linux-* on Linux). Run it from
// anywhere with `node tools/record.mjs` after `yarn build` in the runner
// directory.
import { spawn, spawnSync } from 'node:child_process';
import { once } from 'node:events';
import { appendFileSync, openSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import Cast from './cast.mjs';
import Clock, { capGaps } from './clock.mjs';
import { RUNNERS, reset, writeConfigs } from './configs.mjs';
import steps from './steps.mjs';
import notice from './summary.mjs';
import { healthy } from './waits.mjs';

process.chdir(fileURLToPath(new URL('..', import.meta.url)));
const WINDOWS_BASH = String.raw`C:\Program Files\Git\bin\bash.exe`;
const BASH =
  process.env.DEMO_BASH ??
  (process.platform === 'win32' ? WINDOWS_BASH : 'bash');
const PLATFORM = process.platform === 'win32' ? 'windows' : 'linux';
const NAME = `demo-${PLATFORM}`;
const ROWS = 40;
const clock = new Clock();
const manager = new Cast(clock, 100, ROWS, 'DTaaS runner: the DT Manager');
const network = new Cast(clock, 100, ROWS, 'DTaaS runner: notifications');
const processes = {};

async function poll(condition, deadline) {
  if (await condition()) {
    return;
  }
  if (Date.now() > deadline) {
    throw new Error(`timed out waiting for ${condition}`);
  }
  await new Promise((resolve) => setTimeout(resolve, 200));
  await poll(condition, deadline);
}

const waitFor = (condition, timeoutMs = 60000) =>
  clock.real(() => poll(condition, Date.now() + timeoutMs));

async function run(command) {
  manager.type(command);
  const script = `exec 2>&1; source tools/shell.sh; ${command}`;
  const { stdout, status } = await clock.real(() =>
    spawnSync(BASH, ['-c', script], { encoding: 'utf8' }),
  );
  manager.output(stdout);
  clock.pause(1);
  appendFileSync(
    'run/transcript.txt',
    `$ ${command}  [exit ${status}]\n${stdout}\n`,
  );
}

async function startServices() {
  const child = spawn(process.execPath, ['tools/services.mjs']);
  processes.services = child;
  const [ready] = await once(child.stdout, 'data');
  manager.output(ready.toString());
}

async function startRunner(id) {
  const log = openSync(`run/${id}/runner.log`, 'w');
  processes[id] = spawn(
    process.execPath,
    ['tools/runner.mjs', '-c', RUNNERS[id].config],
    { stdio: ['ignore', log, log], env: { ...process.env, NO_COLOR: '1' } },
  );
  await poll(healthy(id), Date.now() + 60000);
}

async function start({ start: name, show }) {
  manager.type(show);
  await clock.real(() =>
    name === 'services' ? startServices() : startRunner(name),
  );
  clock.pause(1);
}

// Kills the runner at once, as a crash would: the broker publishes its will
async function kill({ kill: id, show }) {
  manager.type(show);
  processes[id].kill('SIGKILL');
  await waitFor(() => exited(id));
  clock.pause(1);
}

const exited = (id) =>
  processes[id].exitCode !== null || processes[id].signalCode !== null;

// What each kind of step does, in the order a step is matched
const actions = {
  chapter: ({ chapter }) => {
    manager.marker(chapter);
    network.marker(chapter);
  },
  say: ({ say }) => manager.say(say),
  run: (step) => run(step.run),
  start: (step) => start(step),
  kill: (step) => kill(step),
  wait: ({ wait }) => waitFor(wait),
  stop: ({ stop: id }) => waitFor(() => exited(id)),
};

async function play(step) {
  const kind = Object.keys(actions).find((key) => step[key]);
  await actions[kind]?.(step);
}

// The network pane: each notification that the subscriber of
// services.mjs received, at the time on the clock when it arrived
function drawNetwork() {
  network.output('\x1b[2mMQTT subscriber: dtaas/+/notify/+\x1b[0m\n\n', 0);
  const lines = readFileSync('run/notify.jsonl', 'utf8').trim().split('\n');
  for (const line of lines) {
    const { at, topic, payload } = JSON.parse(line);
    const text = notice(payload, topic.split('/')[1], true);
    network.output(`${text}\n`, clock.at(at));
  }
}

function report() {
  const time = (seconds) =>
    `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;
  for (const [seconds, type, label] of manager.events) {
    if (type === 'm') {
      console.log(`| ${time(seconds)} | ${label} |`);
    }
  }
  const end = manager.events.at(-1)[0];
  console.log(`length ${time(end)}, ${manager.events.length} events`);
  console.log('for the video, run tools/to-mp4.sh on Linux or in WSL');
}

reset();
writeConfigs();
try {
  // one step after the other
  await steps.reduce(
    (played, step) => played.then(() => play(step)),
    Promise.resolve(),
  );
  drawNetwork();
  capGaps([manager, network]);
  const timestamp = Math.floor(Date.now() / 1000);
  manager.save(`${NAME}-manager.cast`, timestamp);
  network.save(`${NAME}-network.cast`, timestamp);
  report();
} finally {
  Object.values(processes).forEach((child) => child.kill());
}
