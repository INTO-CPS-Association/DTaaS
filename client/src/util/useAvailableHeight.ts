import { RefObject, useLayoutEffect, useState } from 'react';

interface UseAvailableHeightOptions {
  minHeight: number;
  deps?: unknown[];
}

function updateAvailableHeight(
  element: HTMLElement,
  minHeight: number,
  setHeight: (height: number) => void,
): void {
  const { top } = element.getBoundingClientRect();
  let candidate = Math.max(minHeight, window.innerHeight - top);
  element.style.maxHeight = `${candidate}px`;

  const overflow = document.documentElement.scrollHeight - window.innerHeight;
  if (overflow > 0) {
    candidate = Math.max(minHeight, candidate - overflow);
    element.style.maxHeight = `${candidate}px`;
  }

  setHeight(candidate);
}

function setupHeightMeasurement(
  ref: RefObject<HTMLElement | null>,
  minHeight: number,
  setHeight: (height: number) => void,
): (() => void) | undefined {
  const element = ref.current;
  if (!element) return undefined;
  const updateHeight = () =>
    updateAvailableHeight(element, minHeight, setHeight);
  updateHeight();
  window.addEventListener('resize', updateHeight);
  return () => window.removeEventListener('resize', updateHeight);
}

/**
 * Sizes an element to fill the viewport space below its current position,
 * without pushing the page's total height past the viewport. Rather than
 * guessing how much room the page chrome below this element needs (footer,
 * wrapper padding, etc. - not visible to this hook), it applies a candidate
 * height, measures how far the whole page still overflows the viewport, and
 * shrinks by exactly that much.
 */
function useAvailableHeight(
  ref: RefObject<HTMLElement | null>,
  { minHeight, deps = [] }: UseAvailableHeightOptions,
): number | undefined {
  const [height, setHeight] = useState<number>();

  useLayoutEffect(
    () => setupHeightMeasurement(ref, minHeight, setHeight),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    deps,
  );

  return height;
}

export default useAvailableHeight;
