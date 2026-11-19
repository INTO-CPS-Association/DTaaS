/** A timer that runs one action later, replaced by the next, until stopped. */
export default function laterTimer() {
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
