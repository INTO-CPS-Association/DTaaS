import { afterEach, describe, expect, it, jest } from '@jest/globals';
import settles from 'src/mqtt/settles';

describe('settles', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it.each([
    ['resolves', () => Promise.resolve('done')],
    ['rejects', () => Promise.reject(new Error('failed'))],
  ])('Should be true when the promise %s in time', async (_name, promise) => {
    jest.useFakeTimers();

    await expect(settles(promise(), 2000)).resolves.toBe(true);
    expect(jest.getTimerCount()).toBe(0);
  });

  it('Should be false when the promise does not settle in time', async () => {
    jest.useFakeTimers();
    const result = settles(new Promise(() => undefined), 2000);

    await jest.advanceTimersByTimeAsync(1999);
    expect(jest.getTimerCount()).toBe(1);
    await jest.advanceTimersByTimeAsync(1);

    await expect(result).resolves.toBe(false);
  });
});
