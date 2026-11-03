import { lazy, memo } from 'react';
import { isLazyComponent, isLazyLoader } from 'src/extension/lazy';

const Eager = () => <p>eager</p>;

describe('isLazyComponent', () => {
  it('accepts a React.lazy component', () => {
    expect(isLazyComponent(lazy(async () => ({ default: Eager })))).toBe(true);
  });

  it.each([
    ['a function component', Eager],
    ['a memo component', memo(Eager)],
    ['null', null],
    ['undefined', undefined],
    ['a plain object', {}],
    ['a string', 'lazy'],
  ])('rejects %s', (_, value) => {
    expect(isLazyComponent(value)).toBe(false);
  });
});

describe('isLazyLoader', () => {
  it('accepts a zero-argument function', () => {
    expect(isLazyLoader(async () => ({ default: 1 }))).toBe(true);
  });

  it.each([
    ['a function with parameters', (x: number) => x],
    ['an adapter object', { mount: () => undefined }],
    ['undefined', undefined],
  ])('rejects %s', (_, value) => {
    expect(isLazyLoader(value)).toBe(false);
  });
});
