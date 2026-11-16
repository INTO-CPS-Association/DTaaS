// keygen NAME DIR: writes an Ed25519 key pair of a principal, DIR/NAME.key
// (PKCS#8 PEM, readable by the owner only) and DIR/NAME.pub, the public
// key as runner.yaml takes it: the base64url of its 32 raw bytes. Prints
// the public key.
import { generateKeyPairSync } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

export function keygen(name, dir) {
  const { privateKey, publicKey } = generateKeyPairSync('ed25519');
  const { x } = publicKey.export({ format: 'jwk' });
  mkdirSync(dir, { recursive: true });
  const pem = privateKey.export({ type: 'pkcs8', format: 'pem' });
  writeFileSync(join(dir, `${name}.key`), pem, { mode: 0o600 });
  writeFileSync(join(dir, `${name}.pub`), `${x}\n`);
  return x;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [name, dir] = process.argv.slice(2);
  if (name === undefined || dir === undefined) {
    console.error('usage: node keygen.mjs NAME DIR');
    process.exit(2);
  }
  console.log(keygen(name, dir));
}
