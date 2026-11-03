import { afterEach, beforeEach, describe, expect, it } from '@jest/globals';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { readInfluxTokens, readSecretFile } from 'src/config/secrets';
import fillTemplate from 'src/config/template';

describe('Secret files', () => {
  let tempDir = '';

  beforeEach(async () => {
    tempDir = await mkdtemp(path.join(os.tmpdir(), 'dtaas-signals-secrets-'));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it('reads a secret and trims the trailing newline', async () => {
    const file = path.join(tempDir, 'password');
    await writeFile(file, 'pa55word\n');
    await expect(readSecretFile(file, 'rabbitmq-password-file')).resolves.toBe(
      'pa55word',
    );
  });

  it('refuses a missing setting and an empty file', async () => {
    await expect(readSecretFile('', 'rabbitmq-password-file')).rejects.toThrow(
      /not configured/,
    );
    const file = path.join(tempDir, 'empty');
    await writeFile(file, '\n');
    await expect(
      readSecretFile(file, 'rabbitmq-password-file'),
    ).rejects.toThrow(/empty/);
  });

  it('reads InfluxDB tokens by org and refuses another shape', async () => {
    const file = path.join(tempDir, 'tokens.json');
    await writeFile(file, '{"alice":"token-a"}');
    await expect(readInfluxTokens(file)).resolves.toEqual({ alice: 'token-a' });
    await writeFile(file, '["token-a"]');
    await expect(readInfluxTokens(file)).rejects.toThrow(/map each org/);
  });

  it('fills the owner into a template', () => {
    expect(fillTemplate('{owner}', 'alice')).toBe('alice');
    expect(fillTemplate('dt-{owner}-bucket', 'bob')).toBe('dt-bob-bucket');
    expect(fillTemplate('/', 'alice')).toBe('/');
  });
});
