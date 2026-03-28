import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { ensureCertificates } from 'src/config/certificates';

describe('certificate generation', () => {
  let tempDir = '';

  beforeEach(async () => {
    tempDir = await mkdtemp(path.join(os.tmpdir(), 'dtaas-logger-cert-'));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it('returns existing cert and key without openssl call', async () => {
    const certFile = path.join(tempDir, 'fullchain.pem');
    const keyFile = path.join(tempDir, 'privkey.pem');
    await writeFile(certFile, 'cert', 'utf8');
    await writeFile(keyFile, 'key', 'utf8');

    const result = await ensureCertificates(tempDir);

    expect(result).toEqual({ certFile, keyFile });
  });
});
