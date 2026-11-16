import { rmSync } from 'node:fs';
import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import { newCaller } from 'test/sign.util';
import {
  type AccountEntry,
  ACCOUNT,
  freePort,
  health,
  type Layout,
  post,
  privileged,
  scriptAccount,
  startRunner,
  type Started,
  stopRunner,
  waitForHealth,
  writeLayout,
} from './script-user.util';

const ZERO = '0000000000000000';

const FAILED = expect.stringMatching(/^[1-9]/);

// The name=value lines of a script's output
const fields = (stdout: string): Record<string, string> =>
  Object.fromEntries(
    stdout
      .trim()
      .split('\n')
      .map((line) => [
        line.slice(0, line.indexOf('=')),
        line.slice(line.indexOf('=') + 1),
      ]),
  );

// Needs root for setpriv, so it runs on Linux CI only, where sudo asks
// for no password; it is skipped on Windows, in WSL and on a Linux host
// without passwordless sudo
const describePrivileged = privileged() ? describe : describe.skip;

describePrivileged('Scripts as a second account on Linux', () => {
  const alice = newCaller('alice');
  let account: AccountEntry;
  let layout: Layout;
  let port: number;
  let runner: Started;

  beforeAll(async () => {
    account = scriptAccount();
    port = await freePort();
    layout = writeLayout(alice, port);
    runner = startRunner(layout);
    await waitForHealth(port, runner);
  }, 60000);

  afterAll(async () => {
    await stopRunner(layout, runner);
    rmSync(layout.dir, { recursive: true, force: true });
  }, 30000);

  it('Should run a script as the account, without any capability', async () => {
    const reply = await post(port, alice, {
      path: '/',
      body: { name: 'identity' },
    });

    expect(reply.status).toBe('success');
    expect(fields(reply.result?.stdout ?? '')).toEqual({
      user: ACCOUNT,
      groups: String(account.gid),
      CapInh: ZERO,
      CapPrm: ZERO,
      CapEff: ZERO,
      CapAmb: ZERO,
      NoNewPrivs: '1',
      home: account.home,
      pwd: layout.run,
      url: 'set',
      token: 'set',
      key: FAILED,
      config: FAILED,
      write: FAILED,
    });
  }, 20000);

  it('Should stop a script of the account within stopGrace', async () => {
    const execution = post(port, alice, {
      path: '/',
      body: { name: 'loop' },
    });
    await new Promise((done) => {
      setTimeout(done, 1000);
    });

    const stop = await post(port, alice, {
      path: '/stop',
      body: { name: 'loop' },
    });

    expect(stop).toEqual({ stopped: ['loop'] });
    expect((await execution).status).toBe('stopped');
  }, 20000);

  it('Should name the script account in its health', async () => {
    expect(await health(port)).toMatchObject({ scripts: { user: ACCOUNT } });
  });

  it('Should refuse to start with a key that the account may read', async () => {
    const open = writeLayout(alice, await freePort(), true);
    const second = startRunner(open);

    const code = await second.exited;

    rmSync(open.dir, { recursive: true, force: true });
    expect(code).not.toBe(0);
    expect(second.output()).toContain(`${open.key} is readable by ${ACCOUNT}`);
    expect(second.output()).not.toContain('PRIVATE KEY');
  }, 60000);
});
