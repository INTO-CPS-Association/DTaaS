/**
 * Every option of the `aec` substrate, in one table that binds the keys,
 * builds the toolbar and writes the help, so a button and a key cannot
 * disagree. The keys, labels and icons are the Buildings page's.
 */

import type { ViewState } from './aecAppearance';
import type { ViewName } from './aecCamera';
import type { MarkerColours } from './aecColours';

/** What an option needs from the substrate to do its work. */
export interface OptionContext {
  readonly state: ViewState;
  readonly hidden: string[];
  readonly colours: MarkerColours;
  refresh(): void;
  look(from: ViewName): void;
  reset(): void;
  toggleHelp(): void;
  toggleFullscreen(): void;
}

export interface Option {
  readonly key: string;
  readonly label: string;
  /** The name of the icon the toolbar draws, so this file draws nothing. */
  readonly icon: string;
  run(context: OptionContext): void;
  /** Whether a toggle is on. An option without it is an action. */
  on?(context: OptionContext): boolean;
  /** What a toggle with more than two states is set to. */
  badge?(context: OptionContext): string;
}

const toggle = (
  key: string,
  label: string,
  icon: string,
  field: 'transparent' | 'lidsHidden' | 'hoverHighlight',
): Option => ({
  key,
  label,
  icon,
  run: (c) => {
    c.state[field] = !c.state[field];
    c.refresh();
  },
  on: (c) => c.state[field],
});

const view = (
  key: string,
  label: string,
  icon: string,
  from: ViewName,
): Option => ({ key, label, icon, run: (c) => c.look(from) });

/** The heatmap of the Buildings page, here the colours the declaration gives
 * the markers: all of them, one colour rule at a time, or none. */
const heatmap: Option = {
  key: 'm',
  label: 'Heatmap',
  icon: 'heatmap',
  run: (c) => {
    c.colours.cycle();
    c.refresh();
  },
  on: (c) => c.colours.mode !== 'off' && c.colours.quantities.length > 0,
  badge: (c) => c.colours.badge(),
};

const hide: Option = {
  key: 'q',
  label: 'Hide What Is Under The Cursor',
  icon: 'hide',
  run: (c) => {
    if (c.state.hovered) c.hidden.push(c.state.hovered);
    c.refresh();
  },
};

const restore: Option = {
  key: 'w',
  label: 'Bring Back The Last Hidden',
  icon: 'restore',
  run: (c) => {
    c.hidden.pop();
    c.refresh();
  },
};

/** The Buildings page's options, in its order and with its keys. */
export const OPTIONS: readonly Option[] = [
  heatmap,
  toggle('t', 'Transparency', 'transparency', 'transparent'),
  toggle('b', 'Hide Slabs, Roofs And Ceilings', 'slabs', 'lidsHidden'),
  toggle('h', 'Hover Highlight', 'hover', 'hoverHighlight'),
  hide,
  restore,
  view('1', 'Look From Above', 'top', 'top'),
  view('2', 'Look From The Front', 'front', 'front'),
  view('3', 'Look From The Side', 'side', 'side'),
  view('f', 'Fit The Whole Model', 'fit', 'corner'),
  { key: 'r', label: 'Reset Everything', icon: 'reset', run: (c) => c.reset() },
  {
    key: 'a',
    label: 'Fullscreen',
    icon: 'fullscreen',
    run: (c) => c.toggleFullscreen(),
  },
  { key: '?', label: 'Shortcuts', icon: 'help', run: (c) => c.toggleHelp() },
];

const TYPING = new Set(['INPUT', 'TEXTAREA', 'SELECT']);

/** Run the option a key press names, and say whether one ran. */
export function handleKey(event: KeyboardEvent, context: OptionContext) {
  if (event.metaKey || event.ctrlKey || event.altKey) return false;
  const target = event.target as HTMLElement | null;
  if (target && (TYPING.has(target.tagName) || target.isContentEditable)) {
    return false;
  }
  const option = OPTIONS.find((o) => o.key === event.key.toLowerCase());
  option?.run(context);
  return option !== undefined;
}
