import fs from 'node:fs';
import path from 'node:path';
import { builtFiles, scanBuild } from 'test/delivered/secretScan';

// Every file under build/ reaches every browser that opens the client: the
// bundles, their source maps and env.js. This runs after `yarn build` and a
// `yarn config:*` step, as `yarn test:build`, and not with the unit tests,
// which run without a build.
const buildRoot = path.resolve(__dirname, '../../build');

describe('the built client', () => {
  it('exists, with env.js and the bundles', () => {
    expect(fs.existsSync(buildRoot)).toBe(true);
    const files = builtFiles(buildRoot).map((f) => path.basename(f));
    expect(files).toContain('env.js');
    expect(files.some((name) => name.endsWith('.js.map'))).toBe(true);
  });

  it('holds no password, token, URL login or broker setting', () => {
    expect(scanBuild(buildRoot)).toEqual([]);
  });
});
