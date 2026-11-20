import { afterEach, describe, expect, it, jest } from '@jest/globals';
import DescriptorService from 'src/descriptor.service';
import { EscalationData } from 'src/dto/escalation.dto';
import { NotificationDto, offlineNotification } from 'src/dto/notify.dto';
import { EscalationListener } from 'src/fsm/escalation';
import MqttService from 'src/mqtt/mqtt.service';
import Notifier from 'src/notify/notifier.service';
import WebhookClient from 'src/notify/webhook.client';

const NOW = new Date('2026-10-25T10:00:00.000Z');

const document = (time: string, state: string | null = null) => ({
  id: 'hospital-1',
  time,
  machine: state === null ? null : { state, status: 'running' },
  parameters: {},
  command: null,
});

const descriptor = { id: 'hospital-1', attributes: {} };

const online: NotificationDto = {
  kind: 'presence',
  id: 'hospital-1',
  time: NOW.toISOString(),
  data: { online: true, descriptor },
};

// Fakes of the MQTT service and the webhook client; connect() signals a
// connection to the broker
function transports() {
  const connects: Array<() => void> = [];
  const notify = jest.fn<MqttService['notify']>(() => Promise.resolve());
  const onConnect = (listener: () => void) => connects.push(listener);
  const post = jest.fn<WebhookClient['post']>(() => Promise.resolve());
  const sendOnce = jest.fn<WebhookClient['sendOnce']>(() => Promise.resolve());
  return {
    mqtt: { notify, onConnect } as unknown as MqttService,
    webhook: { post, sendOnce } as unknown as WebhookClient,
    calls: { notify, post, sendOnce },
    connect: () => connects.forEach((listener) => listener()),
  };
}

// A notifier over fakes of its sources and transports; change() makes
// the state document the given one and signals the change, escalate()
// is the notifier's escalation listener
function setup() {
  let current = document('2026-10-25T09:59:58.000Z');
  const listeners: Array<() => void> = [];
  const escalations: EscalationListener[] = [];
  const source = {
    describe: () => descriptor,
    state: () => current,
    onChange: (listener: () => void) => listeners.push(listener),
    onEscalation: (listener: EscalationListener) => escalations.push(listener),
  };
  const { mqtt, webhook, calls, connect } = transports();
  const notifier = new Notifier(
    source as unknown as DescriptorService,
    mqtt,
    webhook,
  );
  notifier.onModuleInit();
  const change = (next: ReturnType<typeof document>) => {
    current = next;
    listeners.forEach((listener) => listener());
  };
  return { notifier, ...calls, change, connect, escalate: escalations[0] };
}

describe('Notifier', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it('Should send the state document at startup, retained', () => {
    jest.useFakeTimers({ now: NOW });
    const { notifier, notify, post } = setup();

    notifier.onApplicationBootstrap();

    const envelope: NotificationDto = {
      kind: 'state',
      id: 'hospital-1',
      time: '2026-10-25T09:59:58.000Z',
      data: document('2026-10-25T09:59:58.000Z'),
    };
    expect(notify).toHaveBeenCalledTimes(1);
    expect(notify).toHaveBeenCalledWith('state', envelope, true);
    expect(post.mock.calls).toEqual([[online], [envelope]]);
  });

  it('Should announce the runner over MQTT on each connect', () => {
    jest.useFakeTimers({ now: NOW });
    const { notify, post, connect } = setup();

    connect();
    connect();

    expect(notify.mock.calls).toEqual([
      ['presence', online, true],
      ['presence', online, true],
    ]);
    expect(post).not.toHaveBeenCalled();
  });

  it('Should post the offline notice once at shutdown', async () => {
    jest.useFakeTimers({ now: NOW });
    const { notifier, notify, sendOnce, connect } = setup();

    await notifier.beforeApplicationShutdown();
    connect();

    expect(sendOnce).toHaveBeenCalledWith(
      offlineNotification('hospital-1', NOW.toISOString()),
    );
    expect(notify).not.toHaveBeenCalled();
  });

  it('Should skip a document that changed only its time', () => {
    const { notifier, notify, change } = setup();
    notifier.onApplicationBootstrap();

    change(document('2026-10-25T09:59:59.000Z'));
    expect(notify).toHaveBeenCalledTimes(1);

    change(document('2026-10-25T10:00:00.000Z', 'create'));
    change(document('2026-10-25T10:00:01.000Z', 'create'));
    expect(notify).toHaveBeenCalledTimes(2);
    expect(notify.mock.calls[1][1]).toMatchObject({
      time: '2026-10-25T10:00:00.000Z',
      data: { machine: { state: 'create' } },
    });
  });

  it.each([
    ['escalation', false],
    ['presence', true],
  ] as const)('Should send a %s notification, retained: %p', (kind, retain) => {
    jest.useFakeTimers({ now: NOW });
    const { notifier, notify, post } = setup();

    notifier.send(kind, { online: true });

    const envelope = {
      kind,
      id: 'hospital-1',
      time: '2026-10-25T10:00:00.000Z',
      data: { online: true },
    };
    expect(notify).toHaveBeenCalledWith(kind, envelope, retain);
    expect(post).toHaveBeenCalledWith(envelope);
  });

  it('Should send an escalation of the state machine, unretained', () => {
    jest.useFakeTimers({ now: NOW });
    const { notify, post, escalate } = setup();
    const data: EscalationData = {
      trigger: 'request',
      state: null,
      entry: 0,
      event: null,
      reason: 'capacity',
      proposal: { scope: 'multi' },
    };

    escalate(data);

    const envelope: NotificationDto = {
      kind: 'escalation',
      id: 'hospital-1',
      time: '2026-10-25T10:00:00.000Z',
      data,
    };
    expect(notify).toHaveBeenCalledWith('escalation', envelope, false);
    expect(post).toHaveBeenCalledWith(envelope);
  });

  it('Should send nothing once shutdown begins', async () => {
    const { notifier, notify, post, change } = setup();

    await notifier.beforeApplicationShutdown();
    notifier.onApplicationBootstrap();
    change(document('2026-10-25T10:00:00.000Z', 'create'));
    notifier.send('escalation', {});

    expect(notify).not.toHaveBeenCalled();
    expect(post).not.toHaveBeenCalled();
  });
});
