import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import E2eGateway, {
  ALICE_TOKEN,
  CAROL_TOKEN,
  DAMPER,
  GAUGE,
  READER_TOKEN,
  ROOM,
  VALVE,
} from 'test/helpers/e2e-gateway';

describe('Signals gateway command e2e', () => {
  const gateway = new E2eGateway();
  const { broker } = gateway;
  const post = (route: string, token: string | undefined, body: unknown) =>
    gateway.post(route, token, body);

  beforeAll(() => gateway.start());

  afterAll(() => gateway.stop());

  it('sends a set point of a writer to the command topic of the device', async () => {
    const body = { path: VALVE, command: 'set', value: 40, unit: '%' };
    const response = await post('command', ALICE_TOKEN, body);
    expect(response.status).toBe(202);
    await expect(response.json()).resolves.toEqual({
      status: 'sent',
      topic: 'alice/CTO/plant/01/loop1/A/A-0001/cmd/set',
    });
    expect(JSON.parse(broker.published[0].body)).toMatchObject({ value: 40 });
  });

  it('refuses a command of a reader, and one to a path that takes none', async () => {
    const body = { path: VALVE, command: 'set', value: 40, unit: '%' };
    const sent = broker.published.length;
    expect((await post('command', READER_TOKEN, body)).status).toBe(403);
    const sensor = { ...body, path: ROOM };
    expect((await post('command', ALICE_TOKEN, sensor)).status).toBe(400);
    const readOnly = { ...body, path: GAUGE };
    expect((await post('command', ALICE_TOKEN, readOnly)).status).toBe(403);
    expect((await post('command', undefined, body)).status).toBe(401);
    expect(broker.published).toHaveLength(sent);
  });

  // A set point to the other group's device is refused, also when a twin of
  // the sender's own project declares that device.
  it.each([
    [ALICE_TOKEN, VALVE, DAMPER],
    [CAROL_TOKEN, DAMPER, VALVE],
  ])(
    'sends each group a set point of its own and refuses the other group (%#)',
    async (token, own, other) => {
      const body = (p: string) => ({
        path: p,
        command: 'set',
        value: 40,
        unit: '%',
      });
      const sent = broker.published.length;
      expect((await post('command', token, body(own))).status).toBe(202);
      expect((await post('command', token, body(other))).status).toBe(403);
      expect(broker.published).toHaveLength(sent + 1);
    },
  );
});
