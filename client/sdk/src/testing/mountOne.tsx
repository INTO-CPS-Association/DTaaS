import { type RenderOptions, waitFor } from '@testing-library/react';
import { Route, Routes } from 'react-router-dom';
import type { HostServices } from '../host/hostServices.types';
import type { Mountable } from './collectMountables';
import ConformanceBoundary from './ConformanceBoundary';
import renderWithHost from './renderWithHost';
import { SocketBlockedError } from './socketGuard';

const PENDING = 'data-conformance-pending';

/**
 * Errors are reported in the conformance result, so React's console report of
 * boundary-caught errors is silenced. The cast works around @testing-library/
 * react typing `onCaughtError` as unusable when React's option is optional.
 */
const quietErrors = { onCaughtError: () => undefined } as unknown as Pick<
  RenderOptions,
  'onCaughtError'
>;

const render = (
  host: HostServices,
  { element: Element, path, props, route }: Mountable,
  onError: (error: unknown) => void,
) =>
  renderWithHost(
    <ConformanceBoundary onError={onError}>
      <Routes>
        <Route path={path} element={<Element {...props} />} />
      </Routes>
    </ConformanceBoundary>,
    { host, route, fallback: <span {...{ [PENDING]: '' }} />, ...quietErrors },
  );

const messageOf = (error: unknown) =>
  error instanceof Error ? error.message : String(error);

/** Resolves `true` once the element has loaded or failed, `false` on timeout. */
const settles = async (
  container: HTMLElement,
  failed: () => boolean,
  timeoutMs: number,
) => {
  const pending = () => container.querySelector(`[${PENDING}]`) !== null;
  try {
    await waitFor(
      () => {
        if (!failed() && pending()) throw new Error('still loading');
      },
      { timeout: timeoutMs },
    );
    return true;
  } catch {
    return false;
  }
};

/** Mounts one element, waits for lazy loading, and reports what went wrong. */
const mountOne = async (
  host: HostServices,
  mountable: Mountable,
  timeoutMs: number,
): Promise<string[]> => {
  let caught: unknown;
  const view = render(host, mountable, (error) => {
    caught ??= error;
  });
  const loaded = await settles(
    view.container,
    () => caught !== undefined,
    timeoutMs,
  );
  view.unmount();
  if (!loaded) {
    return [
      `${mountable.label}: did not finish loading within ${timeoutMs} ms`,
    ];
  }
  const reportable =
    caught !== undefined && !(caught instanceof SocketBlockedError);
  return reportable ? [`${mountable.label}: ${messageOf(caught)}`] : [];
};

export default mountOne;
