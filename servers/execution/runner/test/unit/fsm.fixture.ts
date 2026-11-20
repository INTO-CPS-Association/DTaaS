import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, jest } from '@jest/globals';
import Config from 'src/config/configuration.service';
import { StoredMachine } from 'src/dto/fsm.dto';
import ExecaManager from 'src/execa-manager.service';
import FsmService from 'src/fsm/fsm.service';
import { PeerConfig } from 'src/peers/peers.config';
import { CommandResult } from 'src/interfaces/command.interface';
import { RunOptions, RunOutcome } from 'src/interfaces/runner.interface';
import Queue from 'src/queue.service';
import { NO_RESOURCES } from 'src/resources/resources';
import type { ScriptUser } from 'src/scripts/separation';

const DEFINITION = `
events: [stop, reset]
states:
  create: {transitions: {$success: execute, $failure: terminate}}
  execute: {transitions: {stop: terminate}}
  terminate: {transitions: {reset: create}}`;

// The peers of the configuration, which subscriptions may name
export const PEERS: PeerConfig[] = [
  {
    id: 'hospital-2',
    topic: 'dtaas/hospital-2',
    attributes: {},
    enabled: true,
  },
];

// Any name will do, as runner.yaml names the file
export const MACHINE_FILE = 'machine.yaml';

export const settle = () => new Promise(setImmediate);

// What the service passes with each script: its environment
export const withEnv = { env: expect.any(Object) };

// The names of the scripts that the fake manager was asked to run
export const names = (calls: unknown[][]) => calls.map(([name]) => name);

// A script folder with the state machine of the service tests
export function scriptFolder(definition = DEFINITION): string {
  const dir = mkdtempSync(join(tmpdir(), 'fsm-'));
  writeFileSync(join(dir, MACHINE_FILE), definition);
  return dir;
}

type Finishers = Map<string, (outcome: RunOutcome) => void>;

// Stops the named fake run, or every one
const stopper = (finishers: Finishers) =>
  jest.fn((name?: string) => {
    const names = [...finishers.keys()].filter(
      (running) => name === undefined || name === running,
    );
    names.forEach((running) => finishers.get(running)?.('stopped'));
    return Promise.resolve(names);
  });

// Runs each script until the test finishes or stops it
function fakeManager() {
  const finishers: Finishers = new Map();
  const manager = {
    isRunning: jest.fn((name: string) => finishers.has(name)),
    newCommand: jest.fn(
      (name: string, _key?: string, _options?: RunOptions) =>
        new Promise<CommandResult>((resolve) => {
          finishers.set(name, (outcome) => {
            finishers.delete(name);
            resolve([outcome, new Map(), null, NO_RESOURCES]);
          });
        }),
    ),
    stop: stopper(finishers),
  };
  const finish = async (name: string, success: boolean) => {
    finishers.get(name)?.(success ? 'success' : 'failed');
    await settle();
  };
  return { manager, finish };
}

// The service with the state machine of the file, if one is given, and
// the script account, if one is given
export function createService(file: string | undefined, user?: ScriptUser) {
  const { manager, finish } = fakeManager();
  const config = {
    getId: () => 'dt-1',
    getStateMachine: () => file,
    permitCommands: () => ['create', 'execute', 'terminate'],
    getPeers: () => PEERS,
    getScriptUser: () => user,
  } as unknown as Config;
  const queue = {
    setParameters: jest.fn(),
    parameterValues: jest.fn(() => ({})),
    saveMachine: jest.fn(),
    loadMachine: jest.fn((): StoredMachine | undefined => undefined),
    markInterrupted: jest.fn(),
  };
  const service = new FsmService(
    manager as unknown as ExecaManager,
    config,
    queue as unknown as Queue,
  );
  service.load();
  return { service, manager, finish, queue };
}
