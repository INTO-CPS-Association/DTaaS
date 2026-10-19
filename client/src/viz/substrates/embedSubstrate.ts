/**
 * The `embed` substrate: another tool's page, such as a Grafana dashboard, in
 * a frame that follows the one playhead.
 *
 * `timeParams` names the two URL parameters that set the shown time range,
 * `["from", "to"]` for Grafana. While the playhead is live the range is
 * `now-<window>` to `now`, which the tool refreshes on its own, so the frame
 * is not reloaded every second. Scrubbed, the range is absolute and ends at
 * the playhead. `options.windowMs` sets the window, an hour by default.
 */

import type {
  HostServices,
  SubstrateAdapter,
  SubstrateDescriptor,
} from '@into-cps-association/dtaas-sdk';

const HOUR_MS = 3_600_000;

/** A playhead this close to now counts as live. */
const LIVE_SLACK_MS = 2000;

/** The frame address for the playhead at `t`. */
export function embedUrl(
  base: string,
  descriptor: SubstrateDescriptor,
  t: number,
  now: number,
): string {
  if (!descriptor.timeParams) return base;
  const [from, to] = descriptor.timeParams;
  const windowMs = Number(descriptor.options?.windowMs ?? HOUR_MS);
  const url = new URL(base);
  const live = now - t <= LIVE_SLACK_MS;
  url.searchParams.set(
    from,
    live ? `now-${Math.round(windowMs / 1000)}s` : String(t - windowMs),
  );
  url.searchParams.set(to, live ? 'now' : String(t));
  return url.toString();
}

export default function createEmbedSubstrate(
  host: HostServices,
): SubstrateAdapter {
  const frame = document.createElement('iframe');
  let base = '';
  let descriptor: SubstrateDescriptor = { adapter: 'embed' };
  const show = (url: string) => {
    if (frame.src !== url) frame.src = url;
  };
  return {
    id: 'embed',
    supports: [],
    async mount(container, given) {
      if (!given.source) throw new Error('An embed substrate needs a source');
      descriptor = given;
      base = await host.library.resolve(given.source);
      Object.assign(frame.style, {
        border: '0',
        width: '100%',
        minHeight: '24rem',
      });
      frame.title = given.source;
      container.append(frame);
      show(embedUrl(base, descriptor, Date.now(), Date.now()));
    },
    resolve: () => null,
    apply: () => undefined,
    frame: () => undefined,
    pick: () => null,
    setTime: (t) => show(embedUrl(base, descriptor, t, Date.now())),
    dispose: () => frame.remove(),
  };
}
