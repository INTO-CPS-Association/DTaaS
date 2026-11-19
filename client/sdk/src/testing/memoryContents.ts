import type {
  ContentsEntry,
  ContentsService,
  PutOptions,
} from '../host/storage.types';
import toBytes from './bytes';

export interface MemoryContents extends ContentsService {
  /** Stored files keyed by normalised path; tests may inspect it. */
  readonly files: Map<string, Uint8Array>;
}

const normalise = (path: string) => path.replace(/^\/+|\/+$/g, '');

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

/** An in-memory workspace Contents API. */
const createMemoryContents = (
  initial: Record<string, Uint8Array | string> = {},
): MemoryContents => {
  const files = new Map(
    Object.entries(initial).map(([p, c]) => [normalise(p), toBytes(c)]),
  );
  return {
    files,
    list: async (path) => listDirectory(files, normalise(path)),
    exists: async (path) => files.has(normalise(path)),
    get: async (path) => {
      const bytes = files.get(normalise(path));
      if (!bytes) throw new Error(`No such file: ${path}`);
      return bytes;
    },
    put: async (path, bytes, options: PutOptions = {}) => {
      const key = normalise(path);
      if (options.overwrite === false && files.has(key)) {
        throw new Error(`File exists: ${path}`);
      }
      files.set(key, bytes);
    },
  };
};

export default createMemoryContents;
