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

  it('bundles the real bim extension and not its test stand-in', () => {
    const bundles = builtFiles(buildRoot).filter((f) => f.endsWith('.js'));
    const text = bundles.map((f) => fs.readFileSync(f, 'utf-8')).join('\n');

    expect(text).not.toContain('test-stand-in');
    expect(text).toContain('Building Models');
  });

  it('bundles one copy of the extension contract', () => {
    // Each copy of the contract has its own HostProvider context. With two,
    // an extension reads the context the client never filled and throws.
    const bundles = builtFiles(buildRoot).filter((f) => f.endsWith('.js'));
    const copies =
      bundles
        .map((f) => fs.readFileSync(f, 'utf-8'))
        .join('\n')
        .split('useHost() must be used inside <HostProvider>').length - 1;

    expect(copies).toBe(1);
  });

  it('holds no password, token, URL login or broker setting', () => {
    expect(scanBuild(buildRoot)).toEqual([]);
  });
});
