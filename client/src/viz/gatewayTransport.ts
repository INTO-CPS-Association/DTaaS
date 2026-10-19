/**
 * Live signals from the DTaaS signals gateway, as server-sent events.
 *
 * The gateway subscribes to the broker on the server and forwards what the
 * signed-in user may read, so the browser needs no broker login. One stream
 * carries every path in use. When the set of paths changes, the stream is
 * opened again with the new set, a moment later, so a page that subscribes to
 * twenty sensors as it renders opens one stream and not twenty.
 *
 * The gateway reports its own connection to the broker in `state` events.
 * A stream that fails or ends reads `down` until the next one opens, five
 * seconds later unless the gateway asked for another wait with `retry:`.
 */

import type {
  Channel,
  ConnectionState,
  SignalSink,
} from '@into-cps-association/dtaas-sdk';
import { openSse, type SseEvent } from 'viz/sseStream';
import eventHandler from 'viz/gatewayEvents';
import { authorization, endpoint, type GatewaySettings } from 'viz/gateway';
import type { LiveTransport } from 'viz/transport';

/** How long a change of paths waits for the next one, in milliseconds. */
export const REOPEN_DELAY_MS = 100;
/** How long a failed or ended stream waits before the next one. */
export const RECONNECT_DELAY_MS = 5000;

/** The sinks of each path, and whether a change altered the set of paths. */
function pathBook() {
  const sinks = new Map<string, Set<SignalSink>>();
  const add = (paths: readonly string[], sink: SignalSink) =>
    paths.filter((path) => {
      const set = sinks.get(path) ?? new Set<SignalSink>();
      sinks.set(path, set.add(sink));
      return set.size === 1;
    }).length > 0;
  const remove = (paths: readonly string[], sink: SignalSink) =>
    paths.filter((path) => {
      const set = sinks.get(path);
      if (!set?.delete(sink) || set.size > 0) return false;
      return sinks.delete(path);
    });
  return {
    add,
    remove,
    paths: () => [...sinks.keys()],
    sinksOf: (path: string) => sinks.get(path) ?? new Set<SignalSink>(),
  };
}

type PathBook = ReturnType<typeof pathBook>;

function stateCell() {
  let current: ConnectionState = 'connecting';
  const listeners = new Set<() => void>();
  return {
    get: () => current,
    set(next: ConnectionState) {
      if (next === current) return;
      current = next;
      listeners.forEach((listener) => listener());
    },
    on(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}

type StateCell = ReturnType<typeof stateCell>;

interface Stream {
  schedule(delayMs: number): void;
  stop(): void;
}

/** Open one stream, and resolve how long to wait before the next one. */
function openStream(
  settings: GatewaySettings,
  paths: readonly string[],
  onEvent: (event: SseEvent) => void,
  signal: AbortSignal,
): Promise<number> {
  const url = endpoint(settings, 'stream');
  return openSse(
    url,
    { paths },
    authorization(settings),
    onEvent,
    signal,
    settings.fetch,
  ).then(
    (result) => result.retryMs ?? RECONNECT_DELAY_MS,
    () => RECONNECT_DELAY_MS,
  );
}

type Connect = (paths: string[], signal: AbortSignal) => Promise<number>;

/** A timer that runs one action later, replaced by the next, until stopped. */
function laterTimer() {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let stopped = false;
  return {
    after(delayMs: number, action: () => void) {
      clearTimeout(timer);
      if (!stopped) timer = setTimeout(action, delayMs);
    },
    stop() {
      stopped = true;
      clearTimeout(timer);
    },
  };
}

/** After a stream ends on its own, read down and open the next one later. */
function afterEnd(
  own: AbortController,
  state: StateCell,
  schedule: (delayMs: number) => void,
) {
  return (delayMs: number) => {
    if (own.signal.aborted) return;
    state.set('down');
    schedule(delayMs);
  };
}

/** One stream at a time, opened again on request or after it ends. */
function streamRunner(
  wanted: () => string[],
  connect: Connect,
  state: StateCell,
): Stream {
  const later = laterTimer();
  let current: AbortController | undefined;
  const schedule = (delayMs: number) => later.after(delayMs, open);
  function open() {
    current?.abort();
    const paths = wanted();
    current = paths.length > 0 ? new AbortController() : undefined;
    if (!current) return;
    state.set('connecting');
    connect(paths, current.signal).then(afterEnd(current, state, schedule));
  }
  const stop = () => {
    later.stop();
    current?.abort();
  };
  return { schedule, stop };
}

/** Subscribe sinks, and open the stream again when the set of paths changes. */
function subscriber(
  book: PathBook,
  refused: Set<string>,
  stream: Stream,
): LiveTransport['subscribe'] {
  return (paths, sink) => {
    if (book.add(paths, sink)) stream.schedule(REOPEN_DELAY_MS);
    return () => {
      const gone = book.remove(paths, sink);
      gone.forEach((path) => refused.delete(path));
      if (gone.length > 0) stream.schedule(REOPEN_DELAY_MS);
    };
  };
}

export default function createGatewayTransport(
  settings: GatewaySettings & { readonly channel?: Channel },
): LiveTransport {
  const book = pathBook();
  const state = stateCell();
  const refused = new Set<string>();
  const channel = settings.channel ?? 'measured';
  const onEvent = eventHandler({
    sinksOf: book.sinksOf,
    setState: state.set,
    refuse: (path) => refused.add(path),
    channel,
  });
  const wanted = () => book.paths().filter((path) => !refused.has(path));
  const connect: Connect = (paths, signal) =>
    openStream(settings, paths, onEvent, signal);
  const stream = streamRunner(wanted, connect, state);
  return {
    id: `signals gateway ${settings.url}`,
    subscribe: subscriber(book, refused, stream),
    state: state.get,
    onState: state.on,
    close: stream.stop,
  };
}
