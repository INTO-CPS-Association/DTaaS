import { KeyObject } from 'node:crypto';
import { parseJws } from 'src/auth/jws';
import { verifiedPayload } from 'test/sign.util';

// The JSON a payload of the runner carries: the payload itself when it
// is plain JSON, such as the array of a history reply, or else that of
// a compact JWS, which never parses as JSON, read by the runner's own
// parseJws. With a key, only a JWS that the key signed is taken.
export function unwrap(text: string, key?: KeyObject): unknown {
  if (key !== undefined) {
    return verifiedPayload(text, key);
  }
  try {
    return JSON.parse(text);
  } catch {
    return parseJws(text).payload;
  }
}

// The protected header of a compact JWS
export const jwsHeader = (text: string): unknown => parseJws(text).header;
