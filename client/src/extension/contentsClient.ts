/**
 * The `contents` host service: files in the signed-in user's workspace.
 *
 * The workspace is a Jupyter server, the same one the Library page embeds.
 * `api/contents/<path>` lists a directory and takes writes, and `files/<path>`
 * serves the bytes of a file. Every request is credentialed, so the session
 * cookie travels, and a write echoes the `_xsrf` cookie in `X-XSRFToken` when
 * the server set one. A write goes in pieces and under a temporary name, as
 * `contentsUpload.ts` explains, so a large model is stored whole or not at all.
 */

import type {
  ContentsEntry,
  ContentsService,
  PutOptions,
} from '@into-cps-association/dtaas-sdk';
import {
  PARTIAL_SUFFIX,
  discard,
  isFree,
  readXsrfToken,
  rename,
  writePartial,
} from 'extension/contentsUpload';

/** A workspace URL: the base, a server prefix, and an encoded path. */
export function workspaceUrl(base: string, prefix: string, path: string) {
  const root = base.endsWith('/') ? base : `${base}/`;
  const encoded = path.split('/').map(encodeURIComponent).join('/');
  return `${root}${prefix}/${encoded}`;
}

/** Refuse a path that could leave the workspace once a browser resolves it. */
export function assertWorkspacePath(path: string): void {
  const segments = path.split('/');
  if (
    path.startsWith('/') ||
    path.includes('\\') ||
    segments.some((segment) => segment === '..' || segment === '.')
  ) {
    throw new Error(`${path} is not a path inside the workspace`);
  }
}

interface JupyterEntry {
  name: string;
  path: string;
  type: string;
  size?: number | null;
  last_modified?: string;
}

function toEntry(entry: JupyterEntry): ContentsEntry {
  return {
    name: entry.name,
    path: entry.path,
    type: entry.type === 'directory' ? 'directory' : 'file',
    size: entry.size ?? undefined,
    lastModified: entry.last_modified,
  };
}

/** The headers of a write: JSON, and the XSRF token when the server set one. */
function writeHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  const token = readXsrfToken();
  if (token) headers['X-XSRFToken'] = token;
  return headers;
}

async function request(url: string, init: RequestInit = {}) {
  const response = await fetch(url, { credentials: 'include', ...init });
  if (!response.ok) {
    throw new Error(`${url} returned HTTP ${response.status}`);
  }
  return response;
}

/**
 * The contents service of one host. `baseUrl` resolves the user's workspace
 * address, which is only known once the user has signed in.
 */
export default function createContentsService(
  baseUrl: () => Promise<string>,
): ContentsService {
  const url = async (prefix: string, path: string) => {
    assertWorkspacePath(path);
    return workspaceUrl(await baseUrl(), prefix, path);
  };

  const exists = async (path: string) => {
    const target = `${await url('api/contents', path)}?content=0`;
    const response = await fetch(target, { credentials: 'include' });
    if (response.status === 404) return false;
    if (!response.ok) {
      throw new Error(`${target} returned HTTP ${response.status}`);
    }
    return true;
  };

  return {
    exists,
    async list(path) {
      const response = await request(await url('api/contents', path));
      const listing = (await response.json()) as { content?: JupyterEntry[] };
      return (listing.content ?? []).map(toEntry);
    },
    async get(path) {
      const response = await request(await url('files', path));
      return new Uint8Array(await response.arrayBuffer());
    },
    async put(path, bytes, options: PutOptions = {}) {
      const target = await url('api/contents', path);
      const partial = await url('api/contents', `${path}${PARTIAL_SUFFIX}`);
      const overwrite = options.overwrite ?? true;
      if (!overwrite && !(await isFree(target))) {
        throw new Error(`${path} already exists`);
      }
      const headers = writeHeaders();
      try {
        await writePartial(partial, headers, bytes);
        // The rename refuses a taken name, so an overwrite clears it first.
        if (overwrite && !(await isFree(target))) {
          await request(target, { method: 'DELETE', headers });
        }
        await rename(partial, headers, path);
      } catch (error) {
        await discard(partial, headers);
        throw error;
      }
    },
  };
}
