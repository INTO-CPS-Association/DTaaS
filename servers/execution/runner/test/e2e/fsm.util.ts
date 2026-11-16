import { copyFileSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { INestApplication } from '@nestjs/common';
import supertest from 'supertest';

export { startRunner } from './util';

const SCRIPTS = ['create', 'execute', 'terminate'];

const MACHINE_FILE = 'dt.yaml';

// The scripts that print their names, and copies of test scripts
function writeScripts(dir: string, copies: string[]): void {
  SCRIPTS.forEach((script) => {
    writeFileSync(join(dir, script), `#!/bin/sh\nprintf ${script}\n`, {
      mode: 0o755,
    });
    writeFileSync(join(dir, `${script}.ps1`), `Write-Output ${script}\n`);
  });
  copies
    .flatMap((copy) => [copy, `${copy}.ps1`])
    .forEach((file) =>
      copyFileSync(join('test', 'data', 'scripts', file), join(dir, file)),
    );
}

// A folder with a runner configuration, the scripts in both their
// Linux and Windows versions, and the state machine of the definition,
// which the configuration names when there is one. The copies are test
// scripts of test/data/scripts, such as loops that run until they are
// stopped.
export function digitalTwin(
  definition: string | undefined,
  copies: string[] = [],
): string {
  const dir = mkdtempSync(join(tmpdir(), 'runner-fsm-'));
  const commands = [...SCRIPTS, ...copies];
  const config = `id: dt-1\nport: 5000\nlocation: '.'\ncommands: [${commands}]\n`;
  const machine = definition ? `stateMachine: ${MACHINE_FILE}\n` : '';
  writeFileSync(join(dir, 'runner.yaml'), config + machine);
  if (definition) {
    writeFileSync(join(dir, MACHINE_FILE), definition);
  }
  writeScripts(dir, copies);
  return dir;
}

export const post = (app: INestApplication, route: string, body: object) =>
  supertest(app.getHttpServer()).post(route).send(body);

const pause = () =>
  new Promise((resolve) => {
    setTimeout(resolve, 50);
  });

type Body = Record<string, unknown>;

// Polls a GET route until its body passes the check, every 50 ms for up
// to 20 s
export function poll(
  app: INestApplication,
  route: string,
  check: (body: Body) => boolean,
): Promise<Body> {
  const attempt = async (left: number): Promise<Body> => {
    const { body } = await supertest(app.getHttpServer()).get(route);
    if (check(body)) {
      return body;
    }
    if (left === 0) {
      throw new Error(`GET ${route} did not pass the check`);
    }
    await pause();
    return attempt(left - 1);
  };
  return attempt(400);
}

// Polls the machine until the script of the state has finished
export const settled = (app: INestApplication, state: string) =>
  poll(
    app,
    '/fsm',
    (body) => body.state === state && body.status !== 'running',
  );
