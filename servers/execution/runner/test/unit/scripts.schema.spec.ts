import { describe, expect, it } from '@jest/globals';
import { z } from 'zod';
import { configSchema } from 'src/config/config.schema';

const valid = {
  id: 'hospital-1',
  port: 5000,
  location: 'scripts',
  commands: ['create'],
};

const withScripts = (scripts: unknown) => ({ ...valid, scripts });

function problems(config: unknown): string {
  const result = configSchema.safeParse(config);
  return result.success ? '' : z.prettifyError(result.error);
}

describe('The scripts section of runner.yaml', () => {
  it('Should leave the section out by default', () => {
    expect(configSchema.parse(valid).scripts).toBeUndefined();
  });

  it.each([
    ['a name', 'dt-script'],
    ['an integer uid', 999],
    ['a uid as digits', '999'],
    ['a name with a dot', 'dt.script_1'],
  ])('Should take %s as the user', (_, user) => {
    const scripts = { user, runDirectory: 'run' };

    expect(configSchema.parse(withScripts(scripts)).scripts).toEqual(scripts);
  });

  it.each([
    ['a group name', 'dt-script'],
    ['an integer gid', 986],
    ['a gid as digits', '986'],
  ])('Should take %s as the group', (_, group) => {
    const scripts = { user: 'dt-script', group, runDirectory: '/var/run/dt' };

    expect(configSchema.parse(withScripts(scripts)).scripts).toEqual(scripts);
  });

  it.each([
    ['an upper-case name', 'Dt-Script'],
    ['a name with a colon', 'dt:script'],
    ['a name from a digit', '9dt'],
    ['a name of 33 characters', 'a'.repeat(33)],
    ['an empty name', ''],
    ['a negative uid', -1],
    ['a fraction', 1.5],
  ])('Should refuse %s as the user', (_, user) => {
    expect(problems(withScripts({ user, runDirectory: 'run' }))).toContain(
      'scripts.user',
    );
  });

  it('Should need the user', () => {
    expect(problems(withScripts({ runDirectory: 'run' }))).toContain(
      'scripts.user',
    );
  });

  it.each([undefined, ''])('Should need a run directory, not %p', (dir) => {
    expect(
      problems(withScripts({ user: 'dt-script', runDirectory: dir })),
    ).toContain('scripts.runDirectory');
  });

  it('Should refuse an unknown key', () => {
    const scripts = { user: 'dt-script', runDirectory: 'run', home: '/' };

    expect(problems(withScripts(scripts))).toContain('Unrecognized key');
  });

  it('Should refuse an empty section', () => {
    expect(problems(withScripts(null))).toContain('scripts');
  });
});
