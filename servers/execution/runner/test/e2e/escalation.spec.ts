import { rmSync } from 'node:fs';
import { join } from 'node:path';
import { Readable } from 'node:stream';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals';
import { HttpStatus, INestApplication } from '@nestjs/common';
import { connectAsync, MqttClient } from 'mqtt';
import supertest from 'supertest';
import Config from 'src/config/configuration.service';
import MqttService from 'src/mqtt/mqtt.service';
import { digitalTwin, post, settled, startRunner } from './fsm.util';
import { Broker, nextNotification, startBroker, stopBroker } from './mqtt.util';
import Webhook, { Post } from './webhook.util';

// PowerShell takes a second or more to start on a loaded Windows host
const TIMEOUT = 30000;

const TOPIC = 'dtaas/test/escalation';

const ESCALATION = `${TOPIC}/notify/escalation`;

const DEFINITION = `
events: [go]
escalation:
  onNoTransition: true
states:
  create:
`;

const REQUEST = { reason: 'capacity', proposal: { scope: 'multi' } };

// The notification of the request in the state create
const REQUEST_SENT = {
  kind: 'escalation',
  id: 'dt-1',
  time: expect.any(String),
  data: {
    trigger: 'request',
    state: 'create',
    entry: 1,
    event: null,
    ...REQUEST,
  },
};

const isEscalation = ({ body }: Post) => body.kind === 'escalation';

const escalate = (app: INestApplication, body: object, key?: string) => {
  const request = supertest(app.getHttpServer()).post('/escalate');
  return (key ? request.set('Idempotency-Key', key) : request).send(body);
};

// The escalation on the MQTT topic whose reason is the given one
const escalationOf = (client: MqttClient, reason: string) =>
  nextNotification(
    client,
    ESCALATION,
    (data) => (data as unknown as { reason: string }).reason === reason,
  );

// The store of aedes, which its types do not declare
type Persistence = { createRetainedStream: (pattern: string) => Readable };

// The topics under the pattern whose last message the broker retains
async function retainedTopics({ aedes }: Broker, pattern: string) {
  const { persistence } = aedes as unknown as { persistence: Persistence };
  const stream = persistence.createRetainedStream(pattern);
  const packets = (await stream.toArray()) as Array<{ topic: string }>;
  return packets.map(({ topic }) => topic);
}

describe('Escalation', () => {
  // Undo only what started, so that a failed setup can not keep jest
  // from exiting
  const cleanups: Array<() => Promise<void>> = [];
  let broker: Broker;
  let webhook: Webhook;
  let client: MqttClient;
  let app: INestApplication;

  const startServices = async () => {
    broker = await startBroker();
    cleanups.push(() => stopBroker(broker));
    webhook = new Webhook();
    const url = await webhook.listen();
    cleanups.push(() => webhook.close());
    jest.spyOn(Config.prototype, 'getNotify').mockReturnValue({ url });
    jest
      .spyOn(Config.prototype, 'getMqtt')
      .mockReturnValue({ url: broker.url, topic: TOPIC, protocolVersion: 4 });
    client = await connectAsync(broker.url, { protocolVersion: 4 });
    cleanups.push(() => client.endAsync());
    await client.subscribeAsync(`${TOPIC}/notify/+`, { qos: 1 });
  };

  // The runner of the folder, with MQTT and the webhook, once it has
  // subscribed to its request topics
  const startDigitalTwin = async (dir: string) => {
    cleanups.push(() => {
      rmSync(dir, { recursive: true, force: true });
      return Promise.resolve();
    });
    const subscribed = new Promise((resolve) => {
      broker.aedes.on('subscribe', resolve);
    });
    app = await startRunner(join(dir, 'runner.yaml'));
    cleanups.push(() => app.close());
    app.get<MqttService>(MqttService).start();
    await subscribed;
  };

  beforeEach(startServices);

  afterEach(async () => {
    const undo = async (left: Array<() => Promise<void>>): Promise<void> => {
      const last = left.pop();
      if (last !== undefined) {
        await last();
        await undo(left);
      }
    };
    await undo(cleanups);
    jest.restoreAllMocks();
  }, TIMEOUT);

  it(
    'Should send a request to the Manager without retaining it',
    async () => {
      await startDigitalTwin(digitalTwin(DEFINITION));
      await post(app, '/fsm/transition', { state: 'create' });
      await settled(app, 'create');
      const sent = escalationOf(client, 'capacity');

      const reply = await escalate(app, REQUEST, 'key-1');
      const { body, retain } = await sent;
      const posted = await webhook.first(isEscalation);

      expect([reply.status, reply.body]).toEqual([
        HttpStatus.ACCEPTED,
        { status: 'accepted' },
      ]);
      expect([body, retain, posted.body]).toEqual([REQUEST_SENT, false, body]);
      const retained = await retainedTopics(broker, `${TOPIC}/notify/+`);
      expect(retained.sort()).toEqual([
        `${TOPIC}/notify/presence`,
        `${TOPIC}/notify/state`,
      ]);
    },
    TIMEOUT,
  );

  it(
    'Should replay a repeated request key without a second escalation',
    async () => {
      await startDigitalTwin(digitalTwin(DEFINITION));
      const received: string[] = [];
      client.on('message', (topic, payload) => {
        if (topic === ESCALATION) {
          received.push(JSON.parse(payload.toString()).data.reason);
        }
      });
      const last = escalationOf(client, 'last');

      await escalate(app, { reason: 'first' }, 'key-1');
      const repeat = await escalate(app, { reason: 'other' }, 'key-1');
      await escalate(app, { reason: 'last' });
      await last;

      expect([repeat.status, repeat.body]).toEqual([
        HttpStatus.ACCEPTED,
        { status: 'accepted' },
      ]);
      expect(received).toEqual(['first', 'last']);
    },
    TIMEOUT,
  );

  it(
    'Should escalate an event without a transition once',
    async () => {
      await startDigitalTwin(digitalTwin(DEFINITION));
      await post(app, '/fsm/transition', { state: 'create' });
      const sent = escalationOf(client, 'no transition for go in state create');

      const replies = [
        await post(app, '/fsm/event', { event: 'go' }),
        await post(app, '/fsm/event', { event: 'go' }),
      ];
      const { body } = await sent;
      const posted = await webhook.first(isEscalation);

      expect(replies.map(({ status }) => status)).toEqual(
        Array(2).fill(HttpStatus.CONFLICT),
      );
      expect(body.data).toMatchObject({ trigger: 'no-transition', entry: 1 });
      expect(posted.body).toEqual(body);
    },
    TIMEOUT,
  );

  it(
    'Should accept a request without a state machine, and refuse a bad body',
    async () => {
      await startDigitalTwin(digitalTwin(undefined));
      const sent = escalationOf(client, 'plain');

      const accepted = await escalate(app, { reason: 'plain' });
      const refused = await escalate(app, { reason: '' });
      const { body } = await sent;

      expect([accepted.status, refused.status]).toEqual([
        HttpStatus.ACCEPTED,
        HttpStatus.BAD_REQUEST,
      ]);
      expect(refused.body).toMatchObject({ message: 'Validation Failed' });
      expect(body.data).toMatchObject({ state: null, entry: 0 });
    },
    TIMEOUT,
  );
});
