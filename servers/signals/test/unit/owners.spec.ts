import { afterEach, beforeEach, describe, expect, it } from '@jest/globals';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import Owners, { ownsTopic } from 'src/authz/owners';
import testConfig from 'test/helpers/config';

describe('Owners', () => {
  let dir = '';

  beforeEach(async () => {
    dir = await mkdtemp(path.join(os.tmpdir(), 'signals-owners-'));
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  async function ownersWith(text: string) {
    const file = path.join(dir, 'owners.json');
    await writeFile(file, text);
    return new Owners(testConfig({ 'owners-file': file }));
  }

  it('reads the group and the topic prefixes of each owner', async () => {
    const owners = await ownersWith(
      '{"jady": {"group": "swim", "topics": ["SWiM/CTO/", "SWiM/NTU/"]}}',
    );
    const map = await owners.groups();
    expect(map.get('jady')).toEqual({
      group: 'swim',
      topics: ['SWiM/CTO/', 'SWiM/NTU/'],
    });
  });

  it.each([
    '{"jady": {"group": "swim", "topics": ["SWiM/#/"]}}',
    '{"jady": {"group": "swim", "topics": ["SWiM/CTO"]}}',
    '{"jady": {"group": "Swim Group", "topics": ["a/"]}}',
    '{"bad owner": {"group": "swim", "topics": ["a/"]}}',
    '{"jady": ["a/"]}',
  ])('refuses the file %s', async (text) => {
    const owners = await ownersWith(text);
    await expect(owners.groups()).rejects.toThrow('owners-file');
  });

  it('refuses to decide without the file', async () => {
    await expect(new Owners(testConfig()).groups()).rejects.toThrow(
      'owners-file is not configured',
    );
  });
});

describe('ownsTopic', () => {
  const swim = { group: 'swim', topics: ['SWiM/CTO/'] };

  it('matches a prefix up to a level and never a longer name', () => {
    expect(ownsTopic(swim, 'SWiM/CTO/room/1')).toBe(true);
    expect(ownsTopic(swim, 'SWiM/CTOX/room/1')).toBe(false);
    expect(ownsTopic(undefined, 'SWiM/CTO/room/1')).toBe(false);
  });
});
