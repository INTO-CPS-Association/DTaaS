import { afterEach, describe, expect, it, jest } from '@jest/globals';
import Config from 'src/config/configuration.service';
import HealthService from 'src/health.service';
import Queue from 'src/queue.service';
import type { ScriptUser } from 'src/scripts/separation';

function createService(mode: 'file' | 'memory', user?: ScriptUser) {
  const queue = { mode: jest.fn(() => mode) };
  const config = { getScriptUser: () => user };
  return new HealthService(
    queue as unknown as Queue,
    config as unknown as Config,
  );
}

describe('Health service', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it.each([
    ['connected', 'ok'],
    ['disabled', 'ok'],
    ['disconnected', 'degraded'],
  ] as const)('Should report MQTT %s as %s', (mqtt, status) => {
    expect(createService('memory').check(mqtt)).toMatchObject({
      status,
      mqtt,
    });
  });

  it.each(['file', 'memory'] as const)(
    'Should report a %s database',
    (database) => {
      expect(createService(database).check('disabled')).toMatchObject({
        database,
      });
    },
  );

  it('Should report no script account without scripts.user', () => {
    expect(createService('memory').check('disabled').scripts).toBeNull();
  });

  it('Should report the name of the script account', () => {
    const account = {
      name: 'dt-script',
      uid: 999,
      gid: 986,
      home: '/',
      groups: [986],
    };
    const user = { account, runDirectory: '/var/lib/dt/run' };

    expect(createService('file', user).check('connected').scripts).toEqual({
      user: 'dt-script',
    });
  });

  it('Should report the uptime in whole seconds', () => {
    jest.spyOn(process, 'uptime').mockReturnValue(3724.6);
    expect(createService('memory').check('disabled').uptime).toBe(3724);
  });
});
