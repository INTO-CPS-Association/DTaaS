/**
 * Whether the signals gateway refused the signed-in user's token.
 *
 * A refused token (401) is not sent again: the stream and the range stop
 * asking until the token changes, which happens when the person signs in
 * again. Until then the page says to sign in again, so an old tab does not
 * keep knocking at the gateway with a token it already refused.
 */

import { useSyncExternalStore } from 'react';
import type { SignalsService } from '@into-cps-association/dtaas-sdk';

export interface GatewaySession {
  /** Remember that the gateway refused this token. */
  refuse(token: string): void;
  /** Whether this token was refused, so it is not sent again. */
  isRefused(token: string): boolean;
  /** Whether the current token was refused. */
  signInNeeded(): boolean;
  /** React hook form of `signInNeeded`. */
  useSignInNeeded(): boolean;
}

export default function createGatewaySession(
  token: () => string,
): GatewaySession {
  let refused: string | undefined;
  const listeners = new Set<() => void>();
  const subscribe = (listener: () => void) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  };
  const signInNeeded = () => refused !== undefined && refused === token();
  return {
    refuse: (value) => {
      refused = value;
      listeners.forEach((listener) => listener());
    },
    isRefused: (value) => refused !== undefined && refused === value,
    signInNeeded,
    useSignInNeeded: () => useSyncExternalStore(subscribe, signInNeeded),
  };
}

const NO_SESSION: GatewaySession = {
  refuse: () => undefined,
  isRefused: () => false,
  signInNeeded: () => false,
  useSignInNeeded: () => false,
};

/** The gateway session of a signals service, or none when it has no gateway. */
export function sessionOf(signals: SignalsService): GatewaySession {
  return (signals as { session?: GatewaySession }).session ?? NO_SESSION;
}
