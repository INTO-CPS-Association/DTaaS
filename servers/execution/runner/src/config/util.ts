import path from 'node:path';

export default function resolveFile(name: string): string {
  return path.resolve(name);
}
