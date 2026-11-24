import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import * as react from 'react';
import * as reactJsxRuntime from 'react/jsx-runtime';
import * as reactDom from 'react-dom';
import * as reactDomClient from 'react-dom/client';
import * as reactRouterDom from 'react-router-dom';
import * as muiMaterial from '@mui/material';
import * as zod from 'zod';
import * as dtaasSdk from '@into-cps-association/dtaas-sdk';
import * as dtaasSdkSchema from '@into-cps-association/dtaas-sdk/schema';
import {
  checkConformance,
  fakeHostServices,
  runDeployedBundle,
  type DeployedRegistry,
} from '@into-cps-association/dtaas-sdk/testing';
import {
  SHARED_MODULES_GLOBAL,
  validateExtension,
} from '@into-cps-association/dtaas-sdk';

// The modules the host shares, by their keys under DTAAS_SHARED.
const SHARED = {
  react,
  reactJsxRuntime,
  reactDom,
  reactDomClient,
  reactRouterDom,
  muiMaterial,
  dtaasSdk,
  dtaasSdkSchema,
  zod,
};

const ROOT = path.resolve(__dirname, '../..');
const out = mkdtempSync(path.join(tmpdir(), 'dtaas-kit-'));

afterAll(() => rmSync(out, { recursive: true, force: true }));

/**
 * Build the fixture kit with the SDK's `kitBuildConfig`. The kits of this
 * repository are packages of their own and test their own bundles.
 */
function build(): string {
  execFileSync('node', ['tests/fixtures/kit/build.mjs', out], {
    cwd: ROOT,
    stdio: 'pipe',
  });
  return path.join(out, 'index.js');
}

describe('the deployed bundle of a kit', () => {
  let registered: DeployedRegistry;
  let bundle: string;

  beforeAll(() => {
    bundle = build();
    registered = runDeployedBundle(readFileSync(bundle, 'utf-8'), SHARED);
  }, 60_000);

  it('is one script that takes the shared modules from the host', () => {
    const code = readFileSync(bundle, 'utf-8');
    // The page imports one icon. A bundle with every icon of
    // @mui/icons-material would be several megabytes.
    expect(statSync(bundle).size).toBeLessThan(50_000);
    expect(code).toContain(`${SHARED_MODULES_GLOBAL}.react`);
    expect(code).not.toContain('require(');
  });

  it('registers the extension it builds', () => {
    expect(Object.keys(registered)).toEqual(['fixture']);
    expect(validateExtension(registered.fixture.extension)).toEqual({
      valid: true,
      errors: [],
    });
  });

  it('mounts its pages through the host it is given', async () => {
    const host = fakeHostServices({ extensionId: 'fixture' });
    await expect(
      checkConformance(registered.fixture.extension, { host }),
    ).resolves.toEqual({ passed: true, errors: [] });
    expect(host.recorded.logs).toContainEqual({
      level: 'info',
      args: ['fixture ready'],
    });
  });
});
