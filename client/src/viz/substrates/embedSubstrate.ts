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
import { HOUR_MS, isLive } from 'viz/time';

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
  const live = isLive(t, now);
  url.searchParams.set(
    from,
    live ? `now-${Math.round(windowMs / 1000)}s` : String(t - windowMs),
  );
  url.searchParams.set(to, live ? 'now' : String(t));
  return url.toString();
}

/**
 * What the framed page may do. A page of another origin, such as a dashboard,
 * needs its scripts and its own origin to sign in and draw. A page of the
 * DTaaS origin is a file of the user's library, which anyone with write
 * access could have written, so it runs its scripts in an opaque origin and
 * cannot read the DTaaS session or call the DTaaS APIs as the user.
 */
export function sandboxFor(url: string): string {
  const sameOrigin = new URL(url).origin === globalThis.location.origin;
  return sameOrigin
    ? 'allow-scripts'
    : 'allow-scripts allow-same-origin allow-forms allow-popups';
}

/** A frame that sends no referrer, so the DTaaS address does not leak. */
function createFrame(): HTMLIFrameElement {
  const frame = document.createElement('iframe');
  frame.referrerPolicy = 'no-referrer';
  frame.title = 'Embedded dashboard';
  Object.assign(frame.style, {
    border: '0',
    width: '100%',
    minHeight: '24rem',
  });
  return frame;
}

/** The frame of one pane, and the address and descriptor it shows. */
interface Embed {
  readonly frame: HTMLIFrameElement;
  base: string;
  descriptor: SubstrateDescriptor;
}

/** Point the frame at the playhead `t`, unless it already shows it. */
function showAt(embed: Embed, t: number): void {
  const url = embedUrl(embed.base, embed.descriptor, t, Date.now());
  if (embed.frame.src !== url) embed.frame.src = url;
}

async function mountEmbed(
  embed: Embed,
  host: HostServices,
  container: HTMLElement,
  given: SubstrateDescriptor,
): Promise<void> {
  if (!given.source) throw new Error('An embed substrate needs a source');
  embed.descriptor = given;
  embed.base = await host.library.resolve(given.source);
  // The sandbox only applies to pages loaded after it is set.
  embed.frame.setAttribute('sandbox', sandboxFor(embed.base));
  container.append(embed.frame);
  showAt(embed, Date.now());
}

export default function createEmbedSubstrate(
  host: HostServices,
): SubstrateAdapter {
  const embed: Embed = {
    frame: createFrame(),
    base: '',
    descriptor: { adapter: 'embed' },
  };
  return {
    id: 'embed',
    supports: [],
    mount: (container, given) => mountEmbed(embed, host, container, given),
    resolve: () => null,
    apply: () => undefined,
    frame: () => undefined,
    pick: () => null,
    setTime: (t) => showAt(embed, t),
    dispose: () => embed.frame.remove(),
  };
}
