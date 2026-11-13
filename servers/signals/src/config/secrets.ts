import { readFile } from 'node:fs/promises';

// Secrets are read when they are needed and not at startup, so a rotated
// token takes effect without a restart, and the health check works on a
// host that holds no secret.
export default async function readSecretFile(
  filePath: string,
  keyName: string,
): Promise<string> {
  if (filePath === '') throw new Error(`${keyName} is not configured`);
  const secret = (await readFile(filePath, 'utf8')).trim();
  if (secret === '') throw new Error(`The file named by ${keyName} is empty`);
  return secret;
}
