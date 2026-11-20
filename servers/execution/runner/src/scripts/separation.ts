import { accessSync, constants, readFileSync } from 'node:fs';
import type { ConfigValues } from '../config/config.interface.js';
import { type Account, resolveAccount } from './account.js';
import { missingCapabilities } from './capabilities.js';
import { SETPRIV } from './launch.js';
import { type LayoutPaths, layoutProblems } from './layout.js';
import { type LayoutFs, NODE_FS } from './layout.access.js';

// The account that the scripts run as, and their working directory
export type ScriptUser = { account: Account; runDirectory: string };

// What the checks read of the host; tests replace its members
export type Host = {
  platform: NodeJS.Platform;
  getuid(): number;
  readText(path: string): string;
  accessSync(path: string, mode: number): void;
  fs: LayoutFs;
};

export const HOST: Host = {
  platform: process.platform,
  getuid: () => process.getuid?.() ?? -1,
  readText: (path) => readFileSync(path, 'utf8'),
  accessSync: (path, mode) => accessSync(path, mode),
  fs: NODE_FS,
};

const GUIDE = 'See PRIVILEGE-SETUP.md.';

const refusal = (message: string, cause?: unknown): Error =>
  new Error(`${message} ${GUIDE}`, { cause });

function checkPlatform(file: string, { platform }: Host): void {
  if (platform !== 'linux') {
    throw refusal(`scripts.user in ${file} is supported on Linux only.`);
  }
}

function checkRunner(host: Host): void {
  if (host.getuid() === 0) {
    throw refusal('scripts.user refuses a runner that runs as root.');
  }
  try {
    host.accessSync(SETPRIV, constants.X_OK);
  } catch (error) {
    throw refusal(`scripts.user needs ${SETPRIV}, which is missing.`, error);
  }
}

function checkCapabilities(host: Host): void {
  const missing = missingCapabilities(host.readText('/proc/self/status'));
  if (missing.length > 0) {
    throw refusal(
      'scripts.user needs CAP_SETUID, CAP_SETGID and CAP_KILL as ambient ' +
        `capabilities of the runner; missing: ${missing.join(', ')}.`,
    );
  }
}

function account(scripts: NonNullable<ConfigValues['scripts']>, host: Host) {
  const passwd = host.readText('/etc/passwd');
  const group = host.readText('/etc/group');
  try {
    return resolveAccount(scripts, { passwd, group });
  } catch (error) {
    throw refusal(`${(error as Error).message}.`, error);
  }
}

// Separation from oneself or from root protects nothing
function checkDistinct({ name, uid, gid }: Account, host: Host): void {
  if (uid === 0 || uid === host.getuid() || gid === 0) {
    throw refusal(
      `scripts.user ${name} must be neither root nor the runner's account, ` +
        'and its group not root.',
    );
  }
}

// The paths that the layout check judges, resolved as Config resolves
// them
const layoutPaths = (
  file: string,
  { location, database, stateMachine, auth }: ConfigValues,
  { runDirectory }: ScriptUser,
): LayoutPaths => ({
  config: file,
  key: auth?.key,
  stateMachine,
  database,
  scripts: location,
  run: runDirectory,
});

// Every offending path in one error
function layoutError(file: string, { name }: Account, problems: string[]) {
  const heading = `Cannot run the scripts as ${name} (scripts.user in ${file}):`;
  const lines = problems.map((problem) => `✖ ${problem}`);
  return new Error([heading, ...lines, GUIDE].join('\n'));
}

// The checks of scripts.user, in order, on the configuration with its
// paths resolved; nothing without the section. The runner never changes
// a mode: a mismatch stops it.
export function checkSeparation(
  file: string,
  values: ConfigValues,
  host: Host = HOST,
): ScriptUser | undefined {
  const { scripts } = values;
  if (scripts === undefined) {
    return undefined;
  }
  checkPlatform(file, host);
  checkRunner(host);
  checkCapabilities(host);
  const user = {
    account: account(scripts, host),
    runDirectory: scripts.runDirectory,
  };
  checkDistinct(user.account, host);
  const paths = layoutPaths(file, values, user);
  const problems = layoutProblems(paths, user.account, host.fs);
  if (problems.length > 0) {
    throw layoutError(file, user.account, problems);
  }
  return user;
}
