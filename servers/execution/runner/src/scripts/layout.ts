import { posix } from 'node:path';
import type { Account } from './account.js';
import { type LayoutFs, LayoutView } from './layout.access.js';

// The absolute paths that the layout check judges; the optional ones
// are those that runner.yaml may leave out
export type LayoutPaths = {
  config: string;
  key?: string;
  stateMachine?: string;
  database?: string;
  scripts: string;
  run: string;
};

const ABOVE = ', above a protected path';

const when = (problem: boolean, line: string): string[] =>
  problem ? [line] : [];

// The ancestors of the paths through which the account could put its
// own file in place of a protected one
function replaceProblems(view: LayoutView, ...paths: string[]): string[] {
  const dirs = new Set(paths.flatMap((path) => view.replacing(path)));
  return [...dirs].map((dir) => view.line(dir, 'is writable by', ABOVE));
}

// runner.yaml, the key and the state machine file: neither readable
// nor writable, through the path as given or through its link
function secretProblems(view: LayoutView, path: string): string[] {
  const real = view.real(path);
  return [
    ...when(view.readable(real), view.line(real, 'is readable by')),
    ...when(view.writable(real), view.line(real, 'is writable by')),
    ...replaceProblems(view, path, real),
  ];
}

// SQLite writes its journal beside the database with the runner's
// umask, after this check, so the directory must grant nothing at all
function databaseProblems(view: LayoutView, database: string): string[] {
  const dir = posix.dirname(database);
  const realDir = view.real(dir);
  const { r, w, x } = view.rights(realDir);
  const open = view.reaches(realDir) && (r || w || x);
  const file = view.real(database);
  return [
    ...when(open, view.line(realDir, 'grants access to')),
    ...when(view.readable(file), view.line(file, 'is readable by')),
    ...when(view.writable(file), view.line(file, 'is writable by')),
    ...replaceProblems(view, dir, realDir),
  ];
}

// A directory and every entry beneath it, each listed once
function walk(view: LayoutView, path: string, seen: Set<string>): string[] {
  const real = view.real(path);
  if (seen.has(real) || view.stat(real)?.isDirectory() !== true) {
    return [path];
  }
  seen.add(real);
  const below = view.fs
    .readdirSync(real)
    .flatMap((name) => walk(view, posix.join(path, name), seen));
  return [path, ...below];
}

// An entry that links out of the scripts directory has ancestors of
// its own
function entryProblems(view: LayoutView, path: string): string[] {
  const real = view.real(path);
  const outside = real === path ? [] : replaceProblems(view, real);
  return [
    ...when(view.writable(real), view.line(real, 'is writable by')),
    ...outside,
  ];
}

function scriptsProblems(view: LayoutView, scripts: string): string[] {
  const entries = walk(view, scripts, new Set());
  return [
    ...entries.flatMap((path) => entryProblems(view, path)),
    ...replaceProblems(view, scripts, view.real(scripts)),
  ];
}

// The run directory must be a directory that the account reaches and
// may write into
function runProblems(view: LayoutView, run: string): string[] {
  const real = view.real(run);
  if (view.stat(real)?.isDirectory() !== true) {
    return [`${run} does not exist or is not a directory`];
  }
  const { w, x } = view.rights(real);
  return [
    ...view.blocked(real).map((dir) => view.line(dir, 'is not searchable by')),
    ...when(!(w && x), view.line(real, 'is not writable by')),
  ];
}

// One line for each offence, in the order of the paths, without the
// content of any file
export function layoutProblems(
  paths: LayoutPaths,
  account: Account,
  fs: LayoutFs,
): string[] {
  const view = new LayoutView(fs, account);
  const { config, key, stateMachine, database, scripts, run } = paths;
  const secrets = [config, key, stateMachine].filter(
    (path): path is string => path !== undefined,
  );
  const problems = [
    ...secrets.flatMap((path) => secretProblems(view, path)),
    ...(database === undefined ? [] : databaseProblems(view, database)),
    ...scriptsProblems(view, scripts),
    ...runProblems(view, run),
  ];
  return [...new Set(problems)];
}
