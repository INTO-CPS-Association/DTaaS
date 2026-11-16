import {
  createPrivateKey,
  createPublicKey,
  KeyObject,
  sign,
} from 'node:crypto';
import { readFileSync } from 'node:fs';
import { ALG, encodeSegment } from './jws.js';

// An Ed25519 private key, PEM PKCS#8; an error names the file, never
// its content
function readKey(file: string): KeyObject {
  let key: KeyObject;
  try {
    key = createPrivateKey(readFileSync(file));
  } catch (error) {
    throw new Error(
      `Cannot read ${file} as an unencrypted PEM private key: ${error}`,
      { cause: error },
    );
  }
  if (key.asymmetricKeyType !== 'ed25519') {
    throw new Error(`The private key ${file} is not an Ed25519 key`);
  }
  return key;
}

// Encodes what the runner sends on its own or in reply: plain JSON
// without a key, and with one a compact JWS (RFC 7515) whose payload is
// that same JSON, signed with the key of the DT
export default class Signer {
  private readonly header: string;

  private readonly x: string | null;

  constructor(
    private readonly key: KeyObject | undefined,
    kid: string,
  ) {
    this.header = encodeSegment({ alg: ALG, kid });
    this.x =
      key === undefined
        ? null
        : String(createPublicKey(key).export({ format: 'jwk' }).x);
  }

  // The file is a path as Config resolved it, from runner.yaml
  static load(file: string | undefined, id: string): Signer {
    return new Signer(file === undefined ? undefined : readKey(file), id);
  }

  encode(value: unknown): string {
    if (this.key === undefined) {
      return JSON.stringify(value);
    }
    const input = `${this.header}.${encodeSegment(value)}`;
    const signature = sign(null, Buffer.from(input), this.key);
    return `${input}.${signature.toString('base64url')}`;
  }

  // application/jose is the media type of the compact serialisation
  contentType(): string {
    return this.key === undefined ? 'application/json' : 'application/jose';
  }

  // The public key in the encoding of runner.yaml, the x of its JWK
  publicKey(): string | null {
    return this.x;
  }
}
