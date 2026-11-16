// What record.mjs prepares before it starts anything: an empty run/ for
// each DT, and the configurations of the runners with new keys. Run from
// the demo's directory.
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { keygen } from './keygen.mjs';

// Each runner: the configuration in git and the one that record.mjs
// writes, with the peer's public key and an auth section
export const RUNNERS = {
  'hospital-1': { file: 'runner.yaml', config: 'runner.auth.yaml' },
  'hospital-2': { file: 'runner-2.yaml', config: 'runner-2.auth.yaml' },
};
const PRINCIPALS = [
  ['alice', 'client'],
  ['manager-1', 'manager'],
];

export function reset() {
  for (const id of Object.keys(RUNNERS)) {
    rmSync(`run/${id}`, { recursive: true, force: true });
    mkdirSync(`run/${id}`, { recursive: true });
    writeFileSync(`run/${id}/ward.json`, '{"cardiology":[],"maternity":[]}\n');
  }
  for (const file of ['mqtt.log', 'webhook.log', 'notify.jsonl']) {
    rmSync(`run/${file}`, { force: true });
  }
  rmSync('run/shutdown', { force: true });
  rmSync('run/transcript.txt', { force: true });
}

// The auth section of a runner: its signing key, and alice (client)
// and manager-1 (manager), with whose keys sign.mjs signs
function auth(id, principals) {
  const listed = principals.map(
    ([name, role, x]) =>
      `    - name: ${name}\n      role: ${role}\n      publicKey: '${x}'\n`,
  );
  return `auth:\n  key: 'run/keys/${id}.key'\n  principals:\n${listed.join('')}`;
}

// New key pairs in run/keys/, and each runner's configuration with the
// key of its peer, which is the last entry of its file
export function writeConfigs() {
  rmSync('run/keys', { recursive: true, force: true });
  const principals = PRINCIPALS.map(([name, role]) => [
    name,
    role,
    keygen(name, 'run/keys'),
  ]);
  const keys = Object.fromEntries(
    Object.keys(RUNNERS).map((id) => [id, keygen(id, 'run/keys')]),
  );
  for (const [id, { file, config }] of Object.entries(RUNNERS)) {
    const peer = Object.keys(RUNNERS).find((other) => other !== id);
    const text = readFileSync(file, 'utf8');
    const peerKey = `    publicKey: '${keys[peer]}'\n`;
    writeFileSync(config, text + peerKey + auth(id, principals));
  }
}
