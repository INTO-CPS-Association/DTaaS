// Resolves with whether the promise settled, resolved or rejected,
// within the time; the timer is cleared once it does, so that it does
// not hold the process open
const settles = (promise: Promise<unknown>, ms: number): Promise<boolean> =>
  new Promise((resolve) => {
    const timer = setTimeout(() => resolve(false), ms);
    const settled = () => {
      clearTimeout(timer);
      resolve(true);
    };
    promise.then(settled, settled);
  });

export default settles;
