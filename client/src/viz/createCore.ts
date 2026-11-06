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
import { getAccessToken } from 'util/auth/credentials';
import type { LiveTransport } from 'viz/transport';
import createGatewayTransport from 'viz/gatewayTransport';
import createGatewayHistory, { type SignalHistory } from 'viz/gatewayHistory';
import createSignals from 'viz/signals';
import createGatewaySession from 'viz/gatewaySession';
import createVizService from 'viz/vizService';

export interface Core {
  readonly signals: SignalsService;
  readonly viz: VizService;
}

const text = (value: unknown) =>
  typeof value === 'string' && value.trim() !== '' ? value.trim() : undefined;

/** The gateway `env.js` names, with one session for its stream and range. */
const gatewayOf = (env: EnvRecord) => {
  const url = text(env.REACT_APP_VIZ_SIGNALS_URL);
  if (!url) return undefined;
  return {
    url,
    token: getAccessToken,
    session: createGatewaySession(getAccessToken),
  };
};

type Gateway = ReturnType<typeof gatewayOf>;

/** The live transports `env.js` asks for: the signals gateway, or none. */
export function transportsFrom(
  env: EnvRecord,
  gateway: Gateway = gatewayOf(env),
): LiveTransport[] {
  return gateway ? [createGatewayTransport(gateway)] : [];
}

/** Where past samples come from, when `env.js` names a gateway. */
export function historyFrom(
  env: EnvRecord,
  gateway: Gateway = gatewayOf(env),
): SignalHistory | undefined {
  return gateway && createGatewayHistory(gateway);
}

/** The signals of the core, which keep the gateway's session for the page. */
function signalsFrom(env: EnvRecord) {
  const gateway = gatewayOf(env);
  const signals = createSignals(
    transportsFrom(env, gateway),
    undefined,
    historyFrom(env, gateway),
  );
  return Object.assign(signals, { session: gateway?.session });
}

export default function createCore(
  env: EnvRecord,
  contents: ContentsService,
  extensions: readonly DtaasExtension[],
  host: () => HostServices,
): Core {
  return {
    signals: signalsFrom(env),
    viz: createVizService(contents, extensions, host),
  };
}
