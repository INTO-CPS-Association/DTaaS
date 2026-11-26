/**
 * A promise of what `compute` returns, rejected with what it throws. The
 * fakes answer at once, so they need no `async` function with nothing to
 * await, and a throw still reaches the caller as a rejection, as it would
 * from the host's real services.
 */
const settle = <T>(compute: () => T): Promise<T> =>
  new Promise((resolve) => {
    resolve(compute());
  });

export default settle;
