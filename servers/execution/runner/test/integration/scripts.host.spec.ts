import {
  constants,
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import { NODE_FS } from 'src/scripts/layout.access';
import { HOST } from 'src/scripts/separation';

describe('The real host of the script account checks', () => {
  let dir: string;

  beforeAll(() => {
    dir = mkdtempSync(join(tmpdir(), 'runner-host-'));
    mkdirSync(join(dir, 'scripts'));
    writeFileSync(join(dir, 'scripts', 'open'), 'echo open\n');
  });

  afterAll(() => rmSync(dir, { recursive: true, force: true }));

  it('Should stat a path, and give nothing for a missing one', () => {
    expect(NODE_FS.statSync(join(dir, 'scripts'))?.isDirectory()).toBe(true);
    expect(NODE_FS.statSync(join(dir, 'missing'))).toBeUndefined();
  });

  it('Should list a directory and resolve a path', () => {
    expect(NODE_FS.readdirSync(join(dir, 'scripts'))).toEqual(['open']);
    expect(NODE_FS.realpathSync(join(dir, 'scripts', '..', 'scripts'))).toBe(
      NODE_FS.realpathSync(join(dir, 'scripts')),
    );
  });

  it('Should read a file and check its access', () => {
    const file = join(dir, 'scripts', 'open');

    expect(HOST.readText(file)).toBe('echo open\n');
    expect(() => HOST.accessSync(file, constants.R_OK)).not.toThrow();
    expect(() =>
      HOST.accessSync(join(dir, 'missing'), constants.R_OK),
    ).toThrow();
  });

  it("Should give the process's uid, or -1 where there is none", () => {
    expect(HOST.getuid()).toBe(process.getuid?.() ?? -1);
    expect(HOST.platform).toBe(process.platform);
  });
});
