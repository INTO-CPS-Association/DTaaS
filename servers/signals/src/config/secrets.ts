import { readFile } from 'node:fs/promises';
import { z } from 'zod';

const tokensSchema = z.record(z.string().min(1), z.string().trim().min(1));

// Secrets are read when they are needed and not at startup, so a rotated
// password or token takes effect without a restart, and the health check
// works on a host that holds no secret.
export async function readSecretFile(
  filePath: string,
  keyName: string,
): Promise<string> {
  if (filePath === '') throw new Error(`${keyName} is not configured`);
  const secret = (await readFile(filePath, 'utf8')).trim();
  if (secret === '') throw new Error(`The file named by ${keyName} is empty`);
  return secret;
}

export async function readInfluxTokens(
  filePath: string,
): Promise<Record<string, string>> {
  const text = await readSecretFile(filePath, 'influx-tokens-file');
  const parsed = tokensSchema.safeParse(JSON.parse(text));
  if (!parsed.success) {
    throw new Error('influx-tokens-file must map each org to a token');
  }
  return parsed.data;
}
