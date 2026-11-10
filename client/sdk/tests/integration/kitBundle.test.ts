import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import * as react from 'react';
import * as reactJsxRuntime from 'react/jsx-runtime';
import * as reactDom from 'react-dom';
import * as reactRouterDom from 'react-router-dom';
import * as muiMaterial from '@mui/material';
import * as zod from 'zod';
import * as dtaasSdk from '@into-cps-association/dtaas-sdk';
import * as dtaasSdkSchema from '@into-cps-association/dtaas-sdk/schema';
import {
  checkConformance,
  fakeHostServices,
} from '@into-cps-association/dtaas-sdk/testing';
import {
  DEPLOYED_EXTENSIONS_GLOBAL,
  SHARED_MODULES_GLOBAL,
  validateExtension,
  type DtaasExtension,
} from '@into-cps-association/dtaas-sdk';

// The modules the host shares, by their keys under DTAAS_SHARED.
const SHARED = {
  react,
  reactJsxRuntime,
  reactDom,
  reactRouterDom,
  muiMaterial,
  dtaasSdk,
  dtaasSdkSchema,
  zod,
};

const ROOT = path.resolve(__dirname, '../..');
const out = mkdtempSync(path.join(tmpdir(), 'dtaas-kit-'));

afterAll(() => rmSync(out, { recursive: true, force: true }));

/** Build a kit with `yarn build:kit` into a folder of its own. */
function build(kit: string): string {
  const folder = path.join(out, kit);
  execFileSync('node', ['examples/buildKit.mjs', kit, folder], {
    cwd: ROOT,
    stdio: 'pipe',
  });
  return path.join(folder, 'index.js');
}

/** Run a bundle as the browser would and return what it registered. */
function evaluate(
  bundle: string,
): Record<string, { extension: DtaasExtension }> {
  const window: Record<string, unknown> = {};
  // A classic script runs with `this` as the window; the Function constructor
  // runs the bundle the same way, with the shared modules as its one global.
  // eslint-disable-next-line no-new-func
  new Function(SHARED_MODULES_GLOBAL, readFileSync(bundle, 'utf-8')).call(
    window,
    SHARED,
  );
  return window[DEPLOYED_EXTENSIONS_GLOBAL] as Record<
    string,
    { extension: DtaasExtension }
  >;
}

describe.each([
  ['hello-kit', 'hello', { REACT_APP_EXT_HELLO_GREETING: 'Hej' }],
])('the deployed bundle of %s', (kit, id, env) => {
  let registered: Record<string, { extension: DtaasExtension }>;
  let bundle: string;

  beforeAll(() => {
    bundle = build(kit);
    registered = evaluate(bundle);
  }, 60_000);

  it('is one script that takes the shared modules from the host', () => {
    const code = readFileSync(bundle, 'utf-8');
    expect(statSync(bundle).size).toBeLessThan(50_000);
    expect(code).toContain(`${SHARED_MODULES_GLOBAL}.react`);
    expect(code).not.toContain('require(');
  });

  it(`registers the extension ${id}`, () => {
    expect(Object.keys(registered)).toEqual([id]);
    expect(registered[id].extension.id).toBe(id);
    expect(validateExtension(registered[id].extension)).toEqual({
      valid: true,
      errors: [],
    });
  });

  it('mounts its pages through the host it is given', async () => {
    const host = fakeHostServices({ extensionId: id, env });
    await expect(
      checkConformance(registered[id].extension, { host }),
    ).resolves.toEqual({ passed: true, errors: [] });
  });
});
