import { useRef } from 'react';
import { act, render } from '@testing-library/react';
import useAvailableHeight from 'util/useAvailableHeight';

interface TestComponentProps {
  minHeight: number;
  onHeight: (height: number | undefined) => void;
}

function TestComponent({ minHeight, onHeight }: Readonly<TestComponentProps>) {
  const ref = useRef<HTMLDivElement>(null);
  const height = useAvailableHeight(ref, { minHeight });
  onHeight(height);
  return <div ref={ref} />;
}

describe('useAvailableHeight', () => {
  const originalInnerHeight = globalThis.innerHeight;

  afterEach(() => {
    Object.defineProperty(globalThis, 'innerHeight', {
      value: originalInnerHeight,
      configurable: true,
    });
    jest.restoreAllMocks();
  });

  function mockLayout(top: number, scrollHeight: number, innerHeight = 1000) {
    Object.defineProperty(globalThis, 'innerHeight', {
      value: innerHeight,
      configurable: true,
    });
    jest
      .spyOn(Element.prototype, 'getBoundingClientRect')
      .mockReturnValue(new DOMRect(0, top));
    jest
      .spyOn(document.documentElement, 'scrollHeight', 'get')
      .mockReturnValue(scrollHeight);
  }

  it('keeps the naive estimate when the page does not overflow the viewport', () => {
    mockLayout(200, 1000);

    let received: number | undefined;
    render(
      <TestComponent
        minHeight={0}
        onHeight={(h) => {
          received = h;
        }}
      />,
    );

    expect(received).toBe(1000 - 200);
  });

  it('shrinks by the measured overflow when the page is too tall', () => {
    mockLayout(200, 1050);

    let received: number | undefined;
    render(
      <TestComponent
        minHeight={0}
        onHeight={(h) => {
          received = h;
        }}
      />,
    );

    expect(received).toBe(1000 - 200 - 50);
  });

  it('clamps to minHeight when the overflow would shrink past it', () => {
    mockLayout(200, 5000);

    let received: number | undefined;
    render(
      <TestComponent
        minHeight={320}
        onHeight={(h) => {
          received = h;
        }}
      />,
    );

    expect(received).toBe(320);
  });

  it('recomputes on window resize', () => {
    mockLayout(200, 1000);

    let received: number | undefined;
    render(
      <TestComponent
        minHeight={0}
        onHeight={(h) => {
          received = h;
        }}
      />,
    );
    expect(received).toBe(800);

    mockLayout(200, 1300, 1200);
    act(() => {
      globalThis.dispatchEvent(new Event('resize'));
    });

    expect(received).toBe(1200 - 200 - 100);
  });
});
