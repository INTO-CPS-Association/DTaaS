// Starts the runner built from this repository, with the options of
// `runner`, and shuts it down gracefully once the file run/shutdown
// appears. The shutdown is the one of a SIGINT, that is a Ctrl+C, which
// Windows can not send from one process to another.
import { existsSync, rmSync } from 'node:fs';

const SHUTDOWN = 'run/shutdown';
const main = new URL('../../../dist/src/main.js', import.meta.url);

rmSync(SHUTDOWN, { force: true });
await import(main.href);

const timer = setInterval(() => {
  if (existsSync(SHUTDOWN)) {
    clearInterval(timer);
    rmSync(SHUTDOWN);
    process.emit('SIGINT', 'SIGINT');
  }
}, 200);
