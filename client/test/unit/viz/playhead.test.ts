import { act, renderHook } from '@testing-library/react';
import createPlayhead from 'viz/playhead';

describe('the playhead', () => {
  it('is now while live, and a set time once scrubbed', () => {
    let now = 100;
    const playhead = createPlayhead(() => now);

    now = 150;
    expect(playhead.get()).toBe(150);
    playhead.set(120);
    now = 200;
    expect(playhead.get()).toBe(120);
    playhead.follow(true);
    expect(playhead.get()).toBe(200);
  });

  it('re-renders a page when scrubbed and each second while live', () => {
    jest.useFakeTimers();
    let now = 0;
    const playhead = createPlayhead(() => now);
    const { result, unmount } = renderHook(() => playhead.use());

    act(() => playhead.set(42));
    expect(result.current).toBe(42);
    act(() => playhead.follow(true));
    now = 5000;
    act(() => {
      jest.advanceTimersByTime(1000);
    });
    expect(result.current).toBe(5000);
    unmount();
    jest.useRealTimers();
  });
});
