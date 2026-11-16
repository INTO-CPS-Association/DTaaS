import type { Account } from './account.js';
import type { ScriptUser } from './separation.js';

// util-linux installs it here on Debian and Ubuntu; an absolute path
// keeps PATH out of the launch
export const SETPRIV = '/usr/bin/setpriv';

// setpriv(1)'s PATH for a regular user without ENV_PATH in login.defs
export const SCRIPT_PATH = '/usr/local/bin:/bin:/usr/bin';

// The arguments of setpriv that start the script as the account, with
// its groups and no capability. Without --reset-env, which would drop
// the environment that the runner built; without --bounding-set, which
// needs CAP_SETPCAP and is moot under --no-new-privs.
export const launchArgs = ({ uid, gid }: Account, script: string): string[] => [
  `--reuid=${uid}`,
  `--regid=${gid}`,
  '--init-groups',
  '--inh-caps=-all',
  '--ambient-caps=-all',
  '--no-new-privs',
  '--',
  script,
];

export type Inherited = Readonly<Record<string, string | undefined>>;

// What a script's environment starts from: the runner's own without a
// script account, and an allow-list with one
export function scriptBase(
  user: ScriptUser | undefined,
  inherited: Inherited,
): Inherited {
  if (user === undefined) {
    return inherited;
  }
  const { name, home } = user.account;
  const { TMPDIR, LANG } = inherited;
  return {
    HOME: home,
    USER: name,
    LOGNAME: name,
    PATH: SCRIPT_PATH,
    TMPDIR,
    LANG,
  };
}

// The names that glibc drops or distrusts in secure-execution mode, as
// unsecvars.h lists them, and the locale names, as a locale may be a
// path. setpriv holds the capabilities until it switches, without
// secure-execution mode, so its loader would honour them.
const LOADER = /^(?:LD_|MALLOC_|LC_)/;

const UNSECURE = new Set([
  'GCONV_PATH',
  'GETCONF_DIR',
  'GLIBC_TUNABLES',
  'HOSTALIASES',
  'LOCALDOMAIN',
  'LOCPATH',
  'NIS_PATH',
  'NLSPATH',
  'RESOLV_HOST_CONF',
  'RES_OPTIONS',
  'TMPDIR',
  'TZDIR',
  'LANG',
  'LANGUAGE',
]);

export const refusedName = (name: string): boolean =>
  LOADER.test(name) || UNSECURE.has(name);
