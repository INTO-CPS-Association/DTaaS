// The whole contract. `./core` and `./react` hold the same exports split by
// whether they need React at run time, and this entry keeps every import of
// 0.1 working.
export * from './core';
export * from './react';
