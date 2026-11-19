import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { builtFiles, scanBuild, scanText } from 'test/delivered/secretScan';

// The fake secrets are put together at run time, so no file of the
// repository holds one in a shape a secret scanner would report.
const fake = (prefix: string, length = 24) => `${prefix}${'x'.repeat(length)}`;

describe('the scan of the built client for secrets', () => {
  it.each([
    ['login in a URL (user:password@)', `"mqtt://user:${fake('p', 6)}@broker"`],
    ['password with a value', `password: "${fake('p', 8)}"`],
    ['token or secret with a value', `accessToken = '${fake('t')}'`],
    ['GitLab token', fake('glpat-')],
    ['private key', `-----BEGIN RSA ${'PRIVATE'} KEY-----`],
    ['VIZ_MQTT setting', `REACT_APP_${'VIZ_MQTT'}_PASSWORD`],
  ])('finds a %s and reports where, not what', (name, line) => {
    const findings = scanText('a.js', `ok\n${line}`);

    expect(findings).toContainEqual({ file: 'a.js', line: 2, pattern: name });
    expect(JSON.stringify(findings)).not.toContain('xxxx');
  });

  it('passes ordinary code and the public constant of prop-types', () => {
    const text = [
      'const url = "https://gitlab.example/oauth";',
      'input.type = "password";',
      "var ReactPropTypesSecret = 'SECRET_DO_NOT_PASS_THIS_OR_YOU_WILL_BE_FIRED';",
    ].join('\n');

    expect(scanText('a.js', text)).toEqual([]);
  });

  it('reads every bundle, map and env.js under the build folder', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'dtaas-build-'));
    fs.mkdirSync(path.join(root, 'assets'));
    fs.writeFileSync(path.join(root, 'env.js'), 'window.env = {};');
    fs.writeFileSync(
      path.join(root, 'assets', 'index.js.map'),
      `{"x": "${fake('glpat-')}"}`,
    );
    fs.writeFileSync(path.join(root, 'favicon.svg'), '<svg/>');

    expect(
      builtFiles(root)
        .map((f) => path.basename(f))
        .sort(),
    ).toEqual(['env.js', 'index.js.map']);
    expect(scanBuild(root)).toEqual([
      {
        file: path.join('assets', 'index.js.map'),
        line: 1,
        pattern: 'GitLab token',
      },
    ]);
    fs.rmSync(root, { recursive: true, force: true });
  });
});
