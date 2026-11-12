import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import { mkdtemp, rm, symlink } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { isEntrypoint } from 'src/main';

describe('isEntrypoint', () => {
  const mainPath = path.resolve('src/main.ts');
  let tempDir = '';

  beforeAll(async () => {
    tempDir = await mkdtemp(path.join(os.tmpdir(), 'dtaas-signals-main-'));
  });

  afterAll(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it('is false without an entrypoint or for another file', () => {
    expect(isEntrypoint(undefined)).toBe(false);
    expect(isEntrypoint(fileURLToPath(import.meta.url))).toBe(false);
  });

  it('follows a symlink to this module, as the bin entry does', async () => {
    const link = path.join(tempDir, 'signals-ms');
    await symlink(mainPath, link);
    expect(isEntrypoint(link)).toBe(true);
  });
});
