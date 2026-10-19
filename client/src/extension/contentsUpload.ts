/**
 * Writing a file to the workspace through the Jupyter Contents API, safely
 * and at any size. First written for converted building models, now the
 * write every extension gets through `host.contents.put`.
 *
 * Why the write is split
 * ----------------------
 * A converted building is tens of megabytes, and base64 adds a third. Sent as
 * one request the workspace refuses it with HTTP 413 and closes the
 * connection. The Contents API takes a file in pieces instead: the body
 * carries a `chunk` number, the server truncates on chunk one, appends after
 * it, and finishes on `chunk: -1`, as JupyterLab's own uploader does. The
 * pieces go one after another, since the server appends as each lands.
 *
 * Why the bytes go to another name first
 * --------------------------------------
 * A write in pieces can stop part way: the tab closes, the connection drops.
 * So every write goes to `<path>.part` and takes its real name with a rename
 * once the last piece has landed. The server refuses that rename when the
 * name is taken, so a file that appeared meanwhile is never replaced unless
 * the caller asked to overwrite. A failed write deletes its `.part`.
 */

/**
 * The XSRF token the Jupyter server set, or undefined when it set none.
 *
 * A server with XSRF protection rejects a write that does not echo it, and a
 * server without it sets no cookie and accepts the write regardless, so the
 * token is sent when present and left out when not.
 */
export function readXsrfToken(): string | undefined {
  const match = /(?:^|;\s*)_xsrf=([^;]+)/.exec(document.cookie);
  return match ? decodeURIComponent(match[1]) : undefined;
}

/**
 * Base64 of the bytes, built in slices: spreading a whole model into
 * `String.fromCodePoint` passes every byte as an argument and overflows the
 * call stack.
 */
export function toBase64(bytes: Uint8Array): string {
  const SLICE = 0x8000;
  let binary = '';
  for (let index = 0; index < bytes.length; index += SLICE) {
    binary += String.fromCodePoint(...bytes.subarray(index, index + SLICE));
  }
  return btoa(binary);
}

/**
 * How many bytes go in one request. At 512 KB the base64 body is 683 KB,
 * which the workspace accepts, and the first piece measured to fail was 768 KB.
 * A stricter proxy answers 413, and the write is tried once more in pieces of
 * half this size, so one deployment's limit is not a constant for all.
 */
export const CHUNK_BYTES = 512 * 1024;

export const PARTIAL_SUFFIX = '.part';

/** A request the server refused, with the status it refused it with. */
export class UploadError extends Error {
  constructor(
    readonly url: string,
    readonly status: number,
  ) {
    super(`${url} returned HTTP ${status}`);
  }
}

async function send(url: string, init: RequestInit): Promise<void> {
  const response = await fetch(url, { credentials: 'include', ...init });
  if (!response.ok) throw new UploadError(url, response.status);
}

/** One piece, or the whole file when `chunk` is left out. */
function piece(
  url: string,
  headers: HeadersInit,
  bytes: Uint8Array,
  chunk?: number,
) {
  const body: Record<string, unknown> = {
    type: 'file',
    format: 'base64',
    content: toBase64(bytes),
  };
  if (chunk !== undefined) body.chunk = chunk;
  return send(url, { method: 'PUT', headers, body: JSON.stringify(body) });
}

/**
 * Write the bytes in pieces of `size`. A file that fits in one request is
 * sent without a chunk number, since chunk one alone would never be marked
 * complete and the server would not run its post-save hooks.
 */
async function writeInPieces(
  url: string,
  headers: HeadersInit,
  bytes: Uint8Array,
  size: number,
): Promise<void> {
  if (bytes.length <= size) return piece(url, headers, bytes);
  const pieces = Math.ceil(bytes.length / size);
  for (let index = 0; index < pieces; index += 1) {
    const slice = bytes.subarray(index * size, (index + 1) * size);
    // Counted from one, the last marked -1, which is how the server knows the
    // file is complete. The server appends as each lands, so in order.
    // eslint-disable-next-line no-await-in-loop
    await piece(url, headers, slice, index === pieces - 1 ? -1 : index + 1);
  }
  return undefined;
}

/** Write at full size, and once more at half size if a piece was too large. */
export async function writePartial(
  url: string,
  headers: HeadersInit,
  bytes: Uint8Array,
): Promise<void> {
  try {
    await writeInPieces(url, headers, bytes, CHUNK_BYTES);
  } catch (error) {
    if (!(error instanceof UploadError) || error.status !== 413) throw error;
    await writeInPieces(url, headers, bytes, CHUNK_BYTES / 2);
  }
}

/** Give the partial file its real name. The server refuses a taken name. */
export const rename = (
  partialUrl: string,
  headers: HeadersInit,
  path: string,
) =>
  send(partialUrl, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ path }),
  });

/** Delete a file, best effort: a `.part` that stays is truncated next time. */
export async function discard(url: string, headers: HeadersInit) {
  try {
    await fetch(url, { method: 'DELETE', credentials: 'include', headers });
  } catch {
    // Nothing more to do. The next write starts the file over.
  }
}

/**
 * Whether nothing sits at this address. Only a 404 says so: any other answer,
 * or a request that fails outright, is taken to mean a file may be there, so
 * a guess never replaces a file someone made by hand. `content=0` asks for
 * the details without the bytes, so checking a large model does not
 * download it.
 */
export async function isFree(url: string): Promise<boolean> {
  try {
    const response = await fetch(`${url}?content=0`, {
      credentials: 'include',
    });
    return response.status === 404;
  } catch {
    return false;
  }
}
