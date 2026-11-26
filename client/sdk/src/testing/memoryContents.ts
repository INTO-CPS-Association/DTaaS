import type {
  ContentsEntry,
  ContentsService,
  PutOptions,
} from '../host/storage.types';
import toBytes from './bytes';
import settle from './settle';

export interface MemoryContents extends ContentsService {
  /** Stored files keyed by normalised path; tests may inspect it. */
  readonly files: Map<string, Uint8Array>;
}

/**
 * The path without leading and trailing slashes. It scans from both ends
 * instead of matching `/+$`, which backtracks for every run of slashes and
 * takes quadratic time on a path with many of them.
 */
const normalise = (path: string) => {
  let start = 0;
  let end = path.length;
  while (start < end && path[start] === '/') start += 1;
  while (end > start && path[end - 1] === '/') end -= 1;
  return path.slice(start, end);
};

const childEntry = (
  directory: string,
  path: string,
  bytes: Uint8Array,
): ContentsEntry | undefined => {
  const prefix = directory === '' ? '' : `${directory}/`;
  if (!path.startsWith(prefix)) return undefined;
  const [name, ...rest] = path.slice(prefix.length).split('/');
  return rest.length === 0
    ? { name, path, type: 'file', size: bytes.length }
    : { name, path: `${prefix}${name}`, type: 'directory' };
};

const listDirectory = (
  files: Map<string, Uint8Array>,
  directory: string,
): ContentsEntry[] => {
  const entries = new Map<string, ContentsEntry>();
  files.forEach((bytes, path) => {
    const entry = childEntry(directory, path, bytes);
    if (entry) entries.set(entry.name, entry);
  });
  return [...entries.values()].sort((a, b) => a.name.localeCompare(b.name));
};

type Files = Map<string, Uint8Array>;

const readFile = (files: Files, path: string) => {
  const bytes = files.get(normalise(path));
  if (!bytes) throw new Error(`No such file: ${path}`);
  return bytes;
};

const writeFile = (
  files: Files,
  path: string,
  bytes: Uint8Array,
  options: PutOptions,
) => {
  const key = normalise(path);
  if (options.overwrite === false && files.has(key)) {
    throw new Error(`File exists: ${path}`);
  }
  files.set(key, bytes);
};

/** An in-memory workspace Contents API. */
const createMemoryContents = (
  initial: Record<string, Uint8Array | string> = {},
): MemoryContents => {
  const files: Files = new Map(
    Object.entries(initial).map(([p, c]) => [normalise(p), toBytes(c)]),
  );
  return {
    files,
    list: (path) => settle(() => listDirectory(files, normalise(path))),
    exists: (path) => settle(() => files.has(normalise(path))),
    get: (path) => settle(() => readFile(files, path)),
    put: (path, bytes, options: PutOptions = {}) =>
      settle(() => writeFile(files, path, bytes, options)),
  };
};

export default createMemoryContents;
