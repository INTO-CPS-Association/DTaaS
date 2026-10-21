/**
 * The common core of this deployment, built from `env.js`.
 *
 * `REACT_APP_VIZ_SIGNALS_URL` names the signals gateway, which streams live
 * samples and reads past ones for the signed-in user, who proves who they are
 * with their GitLab access token. Nothing connects until a page subscribes to
 * a signal. Without a gateway the core still runs: every connection reads
 * `down`, a range holds only what the client has seen, and visualisations are
 * still read and saved.
 */

import type {
  ContentsService,
  DtaasExtension,
  EnvRecord,
  HostServices,
  SignalsService,
  VizService,
} from '@into-cps-association/dtaas-sdk';
import { getAccessToken } from '@into-cps-association/dt-automation';
import type { LiveTransport } from 'viz/transport';
import createGatewayTransport from 'viz/gatewayTransport';
import createGatewayHistory, { type SignalHistory } from 'viz/gatewayHistory';
import createSignals from 'viz/signals';
import createVizService from 'viz/vizService';

export interface Core {
  readonly signals: SignalsService;
  readonly viz: VizService;
}

const text = (value: unknown) =>
  typeof value === 'string' && value.trim() !== '' ? value.trim() : undefined;

const gatewayOf = (env: EnvRecord) => {
  const url = text(env.REACT_APP_VIZ_SIGNALS_URL);
  return url ? { url, token: getAccessToken } : undefined;
};

/** The live transports `env.js` asks for: the signals gateway, or none. */
export function transportsFrom(env: EnvRecord): LiveTransport[] {
  const gateway = gatewayOf(env);
  return gateway ? [createGatewayTransport(gateway)] : [];
}

/** Where past samples come from, when `env.js` names a gateway. */
export function historyFrom(env: EnvRecord): SignalHistory | undefined {
  const gateway = gatewayOf(env);
  return gateway && createGatewayHistory(gateway);
}

export default function createCore(
  env: EnvRecord,
  contents: ContentsService,
  extensions: readonly DtaasExtension[],
  host: () => HostServices,
): Core {
  return {
    signals: createSignals(transportsFrom(env), undefined, historyFrom(env)),
    viz: createVizService(contents, extensions, host),
  };
}
