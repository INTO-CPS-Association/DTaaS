const REACT_LAZY_TYPE = Symbol.for('react.lazy');

/** True for components created with `React.lazy`, which React tags this way. */
export const isLazyComponent = (value: unknown): boolean =>
  typeof value === 'object' &&
  value !== null &&
  (value as { $$typeof?: unknown }).$$typeof === REACT_LAZY_TYPE;

/**
 * True for a zero-argument function, i.e. a `() => import(...)` loader and
 * not an eagerly constructed adapter, converter or kernel.
 */
export const isLazyLoader = (value: unknown): boolean =>
  typeof value === 'function' && value.length === 0;
