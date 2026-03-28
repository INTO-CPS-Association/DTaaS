import { existsSync } from 'node:fs';
import { chmod, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

export type CertificatePaths = {
  certFile: string;
  keyFile: string;
};

const CERT_FILE = 'fullchain.pem';
const KEY_FILE = 'privkey.pem';
const DEFAULT_KEY_BITS = '4096';
const DEFAULT_DAYS = '825';

function requiredCertificatePaths(certsDirectory: string): CertificatePaths {
  return {
    certFile: path.join(certsDirectory, CERT_FILE),
    keyFile: path.join(certsDirectory, KEY_FILE),
  };
}

function hasUsableCertificates(paths: CertificatePaths): boolean {
  return existsSync(paths.certFile) && existsSync(paths.keyFile);
}

export async function ensureCertificates(
  certsDirectory: string,
): Promise<CertificatePaths> {
  await mkdir(certsDirectory, { recursive: true, mode: 0o700 });
  const paths = requiredCertificatePaths(certsDirectory);
  if (hasUsableCertificates(paths)) {
    return paths;
  }
  await execFileAsync('openssl', [
    'req',
    '-x509',
    '-newkey',
    `rsa:${DEFAULT_KEY_BITS}`,
    '-sha256',
    '-days',
    DEFAULT_DAYS,
    '-nodes',
    '-keyout',
    paths.keyFile,
    '-out',
    paths.certFile,
    '-subj',
    '/CN=localhost',
  ]);
  await Promise.all([
    chmod(paths.keyFile, 0o600),
    chmod(paths.certFile, 0o644),
  ]);
  return paths;
}
