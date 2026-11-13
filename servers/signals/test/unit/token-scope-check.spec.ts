import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { mkdtempSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import GitLabClient from 'src/auth/gitlab.client';
import ownTokenWarnings from 'src/config/token-scope-check';
import testConfig from 'test/helpers/config';

const folder = mkdtempSync(path.join(os.tmpdir(), 'dtaas-signals-token-'));
const tokenFile = path.join(folder, 'gitlab-token');
writeFileSync(tokenFile, 'gateway-token\n', 'utf8');

const CONFIGURED = {
  'gitlab-url': 'https://gitlab.example.org',
  'gitlab-token-file': tokenFile,
};

function answer(status: number, body: unknown) {
  return jest
    .spyOn(globalThis, 'fetch')
    .mockResolvedValue(new Response(JSON.stringify(body), { status }));
}

async function warningsFor(overrides = {}): Promise<string[]> {
  const config = testConfig({ ...CONFIGURED, ...overrides });
  return ownTokenWarnings(config, new GitLabClient(config));
}

describe("the gateway's own token", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('is not checked when no token file or no GitLab is set', async () => {
    const spy = answer(200, { scopes: ['api'] });
    expect(await warningsFor({ 'gitlab-token-file': '' })).toEqual([]);
    expect(await warningsFor({ 'gitlab-url': '' })).toEqual([]);
    expect(spy).not.toHaveBeenCalled();
  });

  it('passes with the read_api scope only, asked with the token itself', async () => {
    const spy = answer(200, { scopes: ['read_api'] });
    expect(await warningsFor()).toEqual([]);
    const [url, init] = spy.mock.calls[0] as unknown as [URL, RequestInit];
    expect(url.href).toBe(
      'https://gitlab.example.org/api/v4/personal_access_tokens/self',
    );
    expect(init.headers).toMatchObject({
      Authorization: 'Bearer gateway-token',
    });
  });

  it('warns about every scope beyond read_api, without the token', async () => {
    answer(200, { scopes: ['read_api', 'api', 'write_repository'] });
    const warnings = await warningsFor();
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toMatch(/beyond read_api \(api, write_repository\)/);
    expect(warnings[0]).not.toMatch(/gateway-token/);
  });

  it('warns when GitLab cannot tell the scopes', async () => {
    answer(404, {});
    const [notFound] = await warningsFor();
    expect(notFound).toMatch(/could not be checked: GitLab answered 404/);
    jest.restoreAllMocks();
    answer(200, { id: 1 });
    expect(await warningsFor()).toHaveLength(1);
  });

  it('warns when the token file cannot be read', async () => {
    const warnings = await warningsFor({
      'gitlab-token-file': path.join(folder, 'missing'),
    });
    expect(warnings[0]).toMatch(/could not be checked/);
  });
});
