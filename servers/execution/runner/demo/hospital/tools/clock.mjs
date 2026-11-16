// The clock of a recording, which its casts share. Typing and pauses
// move it by set amounts, real waits by what they took. It remembers
// each real wait, so that a message that arrived at a real time gets
// its time on the clock. capGaps shortens every gap of the casts
// together, so that they stay in step and end together.
const MAX_GAP = 2;

export default class Clock {
  now = 0;

  // [real start, real end, clock at the start] of each real wait
  waits = [];

  pause(seconds) {
    this.now += seconds;
  }

  // Runs the work, synchronous or not, and moves the clock by its time
  async real(work) {
    const started = Date.now();
    const at = this.now;
    const result = await work();
    const ended = Date.now();
    this.now += (ended - started) / 1000;
    this.waits.push([started, ended, at]);
    return result;
  }

  // The time on the clock of a real time: within a real wait, as far
  // into it; between two, the end of the earlier one
  at(real) {
    const wait = this.waits.findLast(([started]) => started <= real);
    if (wait === undefined) {
      return 0;
    }
    const [started, ended, at] = wait;
    return at + (Math.min(real, ended) - started) / 1000;
  }
}

// The times of every event of the casts with no gap over MAX_GAP
// seconds, then an event that ends each cast at the same time
export function capGaps(casts) {
  const events = casts.flatMap((cast) => cast.events);
  const times = [...new Set(events.map(([time]) => time))].sort(
    (a, b) => a - b,
  );
  const capped = new Map();
  let last = 0;
  times.forEach((time, index) => {
    last += Math.min(time - (times[index - 1] ?? 0), MAX_GAP);
    capped.set(time, last);
  });
  events.forEach((event) => {
    event[0] = Number(capped.get(event[0]).toFixed(3));
  });
  const end = Math.max(...events.map(([time]) => time)) + 1;
  casts.forEach((cast) => cast.events.push([end, 'o', '\x1b[0m']));
  return end;
}
