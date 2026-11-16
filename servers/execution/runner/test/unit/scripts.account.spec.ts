import { describe, expect, it } from '@jest/globals';
import { parseGroup, parsePasswd, resolveAccount } from 'src/scripts/account';

const PASSWD = [
  '# a comment',
  'root:x:0:0:root:/root:/bin/bash',
  '',
  'dt-runner:x:998:998::/var/lib/dt:/usr/sbin/nologin',
  'dt-script:x:999:986::/nonexistent:/usr/sbin/nologin',
  'broken:x:1000',
  'letters:x:abc:1::/:/bin/sh',
].join('\n');

const GROUP = [
  'root:x:0:',
  'dt-runner:x:998:',
  'dt-script:x:986:',
  'sensors:x:1001:alice,dt-script',
  '# staff:x:50:dt-script',
  'odd:x:no:dt-script',
  'readers:x:1002:dt-scripts',
].join('\n');

const files = { passwd: PASSWD, group: GROUP };

describe('Accounts of /etc/passwd and /etc/group', () => {
  it('Should skip comments, blank lines and malformed lines', () => {
    expect(parsePasswd(PASSWD).map(({ name }) => name)).toEqual([
      'root',
      'dt-runner',
      'dt-script',
    ]);
    expect(parseGroup(GROUP).map(({ name }) => name)).toEqual([
      'root',
      'dt-runner',
      'dt-script',
      'sensors',
      'readers',
    ]);
  });

  it('Should read the members of a group', () => {
    expect(parseGroup(GROUP)[3]).toEqual({
      name: 'sensors',
      gid: 1001,
      members: ['alice', 'dt-script'],
    });
  });

  it.each([
    ['a name', 'dt-script'],
    ['a uid', 999],
    ['a uid as digits', '999'],
  ])('Should resolve %s', (_, user) => {
    expect(resolveAccount({ user }, files)).toEqual({
      name: 'dt-script',
      uid: 999,
      gid: 986,
      home: '/nonexistent',
      groups: [986, 1001],
    });
  });

  it.each([
    ['a group name', 'sensors'],
    ['a gid', 1001],
    ['a gid as digits', '1001'],
  ])('Should set the gid of %s', (_, group) => {
    const account = resolveAccount({ user: 'dt-script', group }, files);

    expect(account.gid).toBe(1001);
    expect(account.groups).toEqual([1001, 986]);
  });

  it('Should take a gid that /etc/group does not list', () => {
    const account = resolveAccount({ user: 'dt-script', group: 4242 }, files);

    expect(account.groups).toEqual([4242, 986, 1001]);
  });

  it.each([
    ['an unknown name', 'nobody', 'scripts.user nobody is not in /etc/passwd'],
    ['an unknown uid', 4242, 'scripts.user 4242 is not in /etc/passwd'],
  ])('Should refuse %s', (_, user, message) => {
    expect(() => resolveAccount({ user }, files)).toThrow(message);
  });

  it('Should refuse an unknown group name', () => {
    expect(() =>
      resolveAccount({ user: 'dt-script', group: 'staff' }, files),
    ).toThrow('scripts.group staff is not in /etc/group');
  });
});
