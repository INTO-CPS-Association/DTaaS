/**
 * Which colour each marker of the `aec` substrate shows. Every encoding that
 * gives a marker a colour is one quantity, named by its rule, so a
 * declaration with several colour scales can be read one scale at a time.
 * The heatmap option cycles through all of them together, each alone, and
 * none, as the Buildings page cycles its heatmap scopes.
 */

import type { Encoding } from '@into-cps-association/dtaas-sdk';

/** One colouring rule of the declaration, as a legend states it. */
export interface Quantity {
  readonly key: string;
  readonly scheme?: string;
  readonly domain?: readonly number[];
}

export type ColourMode = 'all' | 'off' | number;

/** The name of the rule an encoding colours by. */
function quantityOf(encoding: Encoding): Quantity {
  const scheme = 'scheme' in encoding ? encoding.scheme : undefined;
  const domain = 'domain' in encoding ? encoding.domain : undefined;
  const key = [scheme ?? encoding.type, domain?.join(' to ')]
    .filter(Boolean)
    .join(' ');
  return { key, scheme, domain };
}

export class MarkerColours {
  readonly quantities: Quantity[] = [];

  mode: ColourMode = 'all';

  /** The latest colour of each marker, by quantity, most recent last. */
  private readonly latest = new Map<string, Map<string, string>>();

  /** Keep a marker's colour, and say whether its quantity is new. */
  record(marker: string, encoding: Encoding, colour: string): boolean {
    const quantity = quantityOf(encoding);
    const known = this.quantities.some((q) => q.key === quantity.key);
    if (!known) this.quantities.push(quantity);
    const colours = this.latest.get(marker) ?? new Map<string, string>();
    colours.delete(quantity.key);
    colours.set(quantity.key, colour);
    this.latest.set(marker, colours);
    return !known;
  }

  /** The colour a marker shows now, or nothing when it is not coloured. */
  colourOf(marker: string): string | undefined {
    const colours = this.latest.get(marker);
    if (this.mode === 'off' || !colours) return undefined;
    if (this.mode === 'all') return [...colours.values()].pop();
    return colours.get(this.quantities[this.mode]?.key ?? '');
  }

  /** All together, then each quantity alone when there are several, then off. */
  private modes(): ColourMode[] {
    const each = this.quantities.length > 1 ? this.quantities.keys() : [];
    return ['all', ...each, 'off'];
  }

  cycle() {
    const modes = this.modes();
    this.mode = modes[(modes.indexOf(this.mode) + 1) % modes.length];
  }

  /** What the heatmap option is set to, for its button. */
  badge(): string {
    if (this.mode === 'all') return 'All';
    if (this.mode === 'off') return 'Off';
    return this.quantities[this.mode]?.key ?? 'Off';
  }

  /** The quantities colouring the markers now. */
  shown(): Quantity[] {
    if (this.mode === 'off') return [];
    if (this.mode === 'all') return this.quantities;
    return this.quantities.slice(this.mode, this.mode + 1);
  }

  /** How many markers have a colour of one quantity. */
  countOf(quantity: Quantity): number {
    return [...this.latest.values()].filter((c) => c.has(quantity.key)).length;
  }

  reset() {
    this.mode = 'all';
  }
}
