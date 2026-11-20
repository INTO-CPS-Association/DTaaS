import { execFile } from 'node:child_process';
import { existsSync } from 'node:fs';
import { promisify } from 'node:util';
import { describe, expect, it } from '@jest/globals';

const MAIN = 'dist/src/main.js';

// ts-jest resolves imports that Node's ES module loader refuses, such as
// a relative import without its .js suffix, so start the build itself.
// Node links every module before main runs, so the help output proves
// that the whole build loads. CI builds before it tests.
describe('Built runner', () => {
  (existsSync(MAIN) ? it : it.skip)(
    'Should load every module of the build',
    async () => {
      const { stdout } = await promisify(execFile)(process.execPath, [
        MAIN,
        '-h',
      ]);

      expect(stdout).toContain('Usage: runner');
    },
    30000,
  );
});
