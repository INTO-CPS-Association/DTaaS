/**
 * The MQTT client, loaded only when a deployment names a broker.
 *
 * MQTT.js and the stream and buffer code it brings are several hundred
 * kilobytes, and most deployments may never set `REACT_APP_VIZ_MQTT_URL`. So
 * the library is imported on first use, and calls made before it arrives are
 * queued and replayed in order, so the transport above it can treat the
 * client as ready from the start.
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

/** A client that forwards every call once the library has loaded. */
export default function lazyClient(
  url: string,
  options: IClientOptions,
  load: Load = loadMqtt,
): BrokerClient {
  const queued: ((client: BrokerClient) => void)[] = [];
  let client: BrokerClient | undefined;
  const call = (action: (target: BrokerClient) => void) => {
    if (client) action(client);
    else queued.push(action);
  };
  load()
    .then((connect) => {
      client = connect(url, options);
      queued.splice(0).forEach((action) => action(client!));
    })
    .catch(() => {
      // Without the library there is no connection, which the transport
      // already reports as connecting, the state it starts in.
    });
  return {
    // A state listener takes no arguments, so it fits the message signature.
    on: (
      event: string,
      listener: (topic: string, payload: Uint8Array) => void,
    ) => call((c) => c.on(event as 'message', listener)),
    subscribe: (topic) => call((c) => c.subscribe(topic)),
    unsubscribe: (topic) => call((c) => c.unsubscribe(topic)),
    end: () => call((c) => c.end()),
  };
}
