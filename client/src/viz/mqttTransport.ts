/**
 * Live signals from the deployment's broker over MQTT on WebSockets.
 *
 * DTaaS deploys RabbitMQ with its Web MQTT plugin, so a browser can subscribe
 * directly. A signal path is the MQTT topic, `dtaas/examples/fzk-haus/room-01/
 * temperature` for instance, so no mapping table is needed. The connection
 * state is reported, so a page can tell a quiet sensor from a dead broker.
 *
 * The broker user named in `env.js` is visible to anyone who opens the page,
 * as every browser credential is, so it should be a user that may only read.
 */

import type {
  Channel,
  ConnectionState,
  SignalSink,
} from '@into-cps-association/dtaas-sdk';
import { sampleFrom } from 'viz/payload';
import lazyClient, { type BrokerClient, type Connect } from 'viz/brokerClient';

export interface MqttSettings {
  readonly url: string;
  readonly username?: string;
  readonly password?: string;
  readonly channel?: Channel;
}

/** A source of samples whose connection state the core can watch. */
export interface LiveTransport {
  readonly id: string;
  subscribe(paths: readonly string[], sink: SignalSink): () => void;
  state(): ConnectionState;
  onState(listener: () => void): () => void;
  close(): void;
}

/** Topics in use, counted, so a topic two pages share is subscribed once. */
function topicCounter(client: BrokerClient) {
  const counts = new Map<string, number>();
  return {
    add(topic: string) {
      const count = counts.get(topic) ?? 0;
      if (count === 0) client.subscribe(topic);
      counts.set(topic, count + 1);
    },
    remove(topic: string) {
      const count = (counts.get(topic) ?? 1) - 1;
      if (count === 0) client.unsubscribe(topic);
      counts.set(topic, count);
    },
  };
}

/** The connection state of a client, and who wants to hear when it changes. */
function connectionOf(client: BrokerClient) {
  let current: ConnectionState = 'connecting';
  const listeners = new Set<() => void>();
  const changed = (state: ConnectionState) => {
    current = state;
    listeners.forEach((listener) => listener());
  };
  client.on('connect', () => changed('live'));
  client.on('reconnect', () => changed('connecting'));
  client.on('offline', () => changed('down'));
  client.on('close', () => changed('down'));
  client.on('error', () => changed('down'));
  return {
    state: () => current,
    onState(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}

/** Hand each message to the sinks of its topic, as a sample. */
function messagesOf(client: BrokerClient, channel: Channel) {
  const sinks = new Map<string, Set<SignalSink>>();
  client.on('message', (topic, payload) => {
    const text = new TextDecoder().decode(payload);
    const sample = sampleFrom(topic, text, channel, Date.now());
    if (sample) sinks.get(topic)?.forEach((sink) => sink(sample));
  });
  return {
    add: (topic: string, sink: SignalSink) =>
      sinks.set(topic, (sinks.get(topic) ?? new Set()).add(sink)),
    remove: (topic: string, sink: SignalSink) => sinks.get(topic)?.delete(sink),
  };
}

export default function createMqttTransport(
  settings: MqttSettings,
  connect: Connect = (url, options) => lazyClient(url, options),
): LiveTransport {
  const client = connect(settings.url, {
    username: settings.username,
    password: settings.password,
    reconnectPeriod: 5000,
  });
  const connection = connectionOf(client);
  const messages = messagesOf(client, settings.channel ?? 'measured');
  const topics = topicCounter(client);
  return {
    id: `mqtt ${settings.url}`,
    subscribe(paths, sink) {
      paths.forEach((path) => {
        messages.add(path, sink);
        topics.add(path);
      });
      return () =>
        paths.forEach((path) => {
          messages.remove(path, sink);
          topics.remove(path);
        });
    },
    ...connection,
    close: () => {
      client.end();
    },
  };
}
