/**
 * The common core of this deployment, built from `env.js`.
 *
 * `REACT_APP_VIZ_MQTT_URL` names the broker's MQTT-over-WebSocket address,
 * for RabbitMQ usually `wss://<host>/ws` behind the gateway, with
 * `REACT_APP_VIZ_MQTT_USERNAME` and `REACT_APP_VIZ_MQTT_PASSWORD` when the
 * broker asks for a login. Without a broker the core still runs: every
 * connection reads `down`, and visualisations are still read and saved.
 */

import type {
  ContentsService,
  DtaasExtension,
  EnvRecord,
  HostServices,
  SignalsService,
  VizService,
} from '@into-cps-association/dtaas-sdk';
import createMqttTransport, { type LiveTransport } from 'viz/mqttTransport';
import createSignals from 'viz/signals';
import createVizService from 'viz/vizService';

export interface Core {
  readonly signals: SignalsService;
  readonly viz: VizService;
}

const text = (value: unknown) =>
  typeof value === 'string' && value.trim() !== '' ? value.trim() : undefined;

/** The live transports `env.js` asks for: one broker, or none. */
export function transportsFrom(env: EnvRecord): LiveTransport[] {
  const url = text(env.REACT_APP_VIZ_MQTT_URL);
  if (!url) return [];
  return [
    createMqttTransport({
      url,
      username: text(env.REACT_APP_VIZ_MQTT_USERNAME),
      password: text(env.REACT_APP_VIZ_MQTT_PASSWORD),
    }),
  ];
}

export default function createCore(
  env: EnvRecord,
  contents: ContentsService,
  extensions: readonly DtaasExtension[],
  host: () => HostServices,
): Core {
  return {
    signals: createSignals(transportsFrom(env)),
    viz: createVizService(contents, extensions, host),
  };
}
