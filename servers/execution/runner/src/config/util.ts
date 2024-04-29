import path from 'node:path';

export default function resolveFile(name: string): string {
  let resolvedFilename: string;

  if (path.isAbsolute(name)) {
    resolvedFilename = name;
  } else {
    resolvedFilename = path.join(process.cwd(), name);
  }
  return resolvedFilename;
}
