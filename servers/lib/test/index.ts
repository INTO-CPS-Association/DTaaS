import sum from '../src/index';

test('adds 1 + 2 to equal 3', () => {
  const a = 1;
  const b = 2;
  const c = 3;

  expect(sum(a, b)).toBe(c);
});
