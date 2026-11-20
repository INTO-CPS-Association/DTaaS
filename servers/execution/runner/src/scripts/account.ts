import type { AccountId, ScriptsConfig } from './scripts.config.js';

// The account that the scripts run as. groups holds every group that
// the account may hold: the gid that setpriv sets, the primary gid of
// /etc/passwd and each group of /etc/group that lists the name, which
// is at least what setpriv --init-groups sets
export type Account = {
  name: string;
  uid: number;
  gid: number;
  home: string;
  groups: number[];
};

export type PasswdEntry = {
  name: string;
  uid: number;
  gid: number;
  home: string;
};

export type GroupEntry = { name: string; gid: number; members: string[] };

// The texts of /etc/passwd and /etc/group
export type AccountFiles = { passwd: string; group: string };

const NUMBER = /^\d+$/;

// The fields of each line with the given number of fields; comments,
// blank lines and other lines are skipped
const records = (text: string, count: number): string[][] =>
  text
    .split('\n')
    .filter((line) => !line.startsWith('#'))
    .map((line) => line.split(':'))
    .filter((fields) => fields.length === count);

const numeric = (...values: string[]): boolean =>
  values.every((value) => NUMBER.test(value));

export const parsePasswd = (text: string): PasswdEntry[] =>
  records(text, 7)
    .filter(([, , uid, gid]) => numeric(uid, gid))
    .map(([name, , uid, gid, , home]) => ({
      name,
      uid: Number(uid),
      gid: Number(gid),
      home,
    }));

export const parseGroup = (text: string): GroupEntry[] =>
  records(text, 4)
    .filter(([, , gid]) => numeric(gid))
    .map(([name, , gid, members]) => ({
      name,
      gid: Number(gid),
      members: members.split(',').filter((member) => member !== ''),
    }));

// A number, as an integer or a string of digits, is an id; anything
// else a name
const asNumber = (id: AccountId): number | undefined =>
  typeof id === 'number' || NUMBER.test(id) ? Number(id) : undefined;

const matches = (id: AccountId, name: string, number: number): boolean =>
  asNumber(id) === undefined ? id === name : asNumber(id) === number;

const unknown = (key: string, id: AccountId, file: string): Error =>
  new Error(`scripts.${key} ${id} is not in ${file}`);

// A gid stands for itself; a group name must be in /etc/group
function resolveGroup(id: AccountId, groups: GroupEntry[]): number {
  const gid = asNumber(id);
  if (gid !== undefined) {
    return gid;
  }
  const entry = groups.find(({ name }) => name === id);
  if (entry === undefined) {
    throw unknown('group', id, '/etc/group');
  }
  return entry.gid;
}

// The account of scripts.user and scripts.group, or an error naming
// the key and the value that do not resolve; a uid needs an entry too,
// as setpriv --init-groups refuses one without
export function resolveAccount(
  { user, group }: Pick<ScriptsConfig, 'user' | 'group'>,
  files: AccountFiles,
): Account {
  const entry = parsePasswd(files.passwd).find(({ name, uid }) =>
    matches(user, name, uid),
  );
  if (entry === undefined) {
    throw unknown('user', user, '/etc/passwd');
  }
  const groups = parseGroup(files.group);
  const gid = group === undefined ? entry.gid : resolveGroup(group, groups);
  const listed = groups
    .filter(({ members }) => members.includes(entry.name))
    .map(({ gid: listedGid }) => listedGid);
  const { name, uid, home } = entry;
  const all = new Set([gid, entry.gid, ...listed]);
  return { name, uid, gid, home, groups: [...all] };
}
