import { readHostTree } from './linux-tree.js';
import PollingWatch from './polling-watch.js';
import { type Meter, NO_WATCH, type ResourceWatch } from './resources.js';
import { windowsSampler } from './windows.js';

type Watch = (pid: number, start: number) => ResourceWatch;

const WATCHES: Partial<Record<NodeJS.Platform, Watch>> = {
  linux: (pid) => new PollingWatch(() => readHostTree(pid)),
  win32: windowsSampler,
};

// The meter of the platform; one that measures nothing on a platform
// without one, and for a process that did not start
export function meterFor(platform: NodeJS.Platform): Meter {
  const watch = WATCHES[platform];
  if (watch === undefined) {
    return () => NO_WATCH;
  }
  return (pid, start) => (pid === undefined ? NO_WATCH : watch(pid, start));
}
