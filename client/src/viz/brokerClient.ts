/**
 * The MQTT client, loaded and connected only when a page first subscribes.
 *
 * MQTT.js and the stream and buffer code it brings are several hundred
 * kilobytes, and most pages never show a live signal. So the library is
 * imported, and the broker connected, on the first subscription, and calls
 * made before then are queued and replayed in order, so the transport above
 * it can treat the client as ready from the start.
 */

import type { IClientOptions } from 'mqtt';

/** The part of an MQTT client the transport uses. */
export interface BrokerClient {
  on(
    event: 'message',
    listener: (topic: string, payload: Uint8Array) => void,
  ): unknown;
  on(event: string, listener: () => void): unknown;
  subscribe(topic: string): unknown;
  unsubscribe(topic: string): unknown;
  end(): unknown;
}

export type Connect = (url: string, options: IClientOptions) => BrokerClient;

type Load = () => Promise<Connect>;

const loadMqtt: Load = async () => (await import('mqtt')).default.connect;

/** Calls held until the real client exists, then forwarded straight away. */
function pendingCalls() {
  const queued: ((client: BrokerClient) => void)[] = [];
  const closed = new Set<() => void>();
  let client: BrokerClient | undefined;
  const call = (action: (target: BrokerClient) => void) => {
    if (client) action(client);
    else queued.push(action);
  };
  return {
    call,
    ready(real: BrokerClient) {
      client = real;
      queued.splice(0).forEach((action) => action(real));
    },
    // A state listener takes no arguments, so it fits the message signature.
    on(event: string, listener: (topic: string, payload: Uint8Array) => void) {
      if (event === 'close') closed.add(listener as () => void);
      call((c) => c.on(event as 'message', listener));
    },
    /** Tell the close listeners, since a client that never loaded is closed. */
    fail: () => closed.forEach((listener) => listener()),
  };
}

/** Load the library and connect, once, however often it is asked. */
function connectOnce(
  load: Load,
  connect: (library: Connect) => void,
  failed: () => void,
) {
  let started = false;
  return () => {
    if (started) return;
    started = true;
    load().then(connect).catch(failed);
  };
}

/** A client that loads the library and connects on its first subscription. */
export default function lazyClient(
  url: string,
  options: IClientOptions,
  load: Load = loadMqtt,
): BrokerClient {
  const calls = pendingCalls();
  // Without the library there is no connection, so the transport is told the
  // connection closed and reads down, instead of connecting for ever.
  const start = connectOnce(
    load,
    (connect) => calls.ready(connect(url, options)),
    calls.fail,
  );
  return {
    on: calls.on,
    subscribe: (topic) => {
      start();
      calls.call((c) => c.subscribe(topic));
    },
    unsubscribe: (topic) => calls.call((c) => c.unsubscribe(topic)),
    end: () => calls.call((c) => c.end()),
  };
}
