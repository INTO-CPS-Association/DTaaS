import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { Logger } from '@nestjs/common';
import AccessService from 'src/authz/access.service';
import type { AccessPolicy, SignalTarget } from 'src/authz/policy';

const ALICE = { id: 7, username: 'alice', token: 'secret-token' };

function target(path: string, twin = 'pump'): SignalTarget {
  return { path, owner: 'alice', twin, channel: 'measured', vhost: 'alice' };
}

function policyListing(targets: SignalTarget[] | Error): AccessPolicy {
  return {
    check: async () => ({ allowed: false }),
    listResources: async () => {
      if (targets instanceof Error) throw targets;
      return targets;
    },
  };
}

describe('AccessService', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('splits the paths into allowed and refused', async () => {
    const service = new AccessService(
      policyListing([target('a/b'), target('a/c')]),
    );
    const decision = await service.decide(ALICE, 'stream', ['a/b', 'x/y']);
    expect(decision.allowed.map((t) => t.path)).toEqual(['a/b']);
    expect(decision.refused).toEqual(['x/y']);
  });

  it('takes the first twin that declares a topic', async () => {
    const service = new AccessService(
      policyListing([target('a/b', 'one'), target('a/b', 'two')]),
    );
    const decision = await service.decide(ALICE, 'stream', ['a/b']);
    expect(decision.allowed[0].twin).toBe('one');
  });

  it('refuses every path when the policy fails', async () => {
    const service = new AccessService(
      policyListing(new Error('GitLab answered 502')),
    );
    const decision = await service.decide(ALICE, 'range', ['a/b']);
    expect(decision).toEqual({ allowed: [], refused: ['a/b'] });
  });

  it('logs each decision with the user and never the token', async () => {
    const lines: string[] = [];
    jest
      .spyOn(Logger.prototype, 'log')
      .mockImplementation((message: unknown) => {
        lines.push(String(message));
      });
    jest
      .spyOn(Logger.prototype, 'warn')
      .mockImplementation((message: unknown) => {
        lines.push(String(message));
      });
    await new AccessService(policyListing([target('a/b')])).decide(
      ALICE,
      'stream',
      ['a/b', 'c'],
    );
    await new AccessService(policyListing(new Error('down'))).decide(
      ALICE,
      'stream',
      ['a/b'],
    );
    expect(JSON.parse(lines[0])).toEqual({
      user: 'alice',
      action: 'stream',
      resource: 'a/b',
      decision: 'allow',
    });
    expect(JSON.parse(lines[1])).toMatchObject({
      resource: 'c',
      decision: 'deny',
    });
    expect(lines.join('\n')).not.toContain('secret-token');
  });
});
