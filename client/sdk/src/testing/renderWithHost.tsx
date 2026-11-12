import { type ReactElement, type ReactNode, Suspense } from 'react';
import {
  render,
  type RenderOptions,
  type RenderResult,
} from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { HostProvider } from '../host/HostProvider';
import type { HostServices } from '../host/hostServices.types';
import fakeHostServices, { type FakeHostServices } from './fakeHostServices';

export interface RenderWithHostOptions<H extends HostServices> extends Omit<
  RenderOptions,
  'wrapper' | 'queries'
> {
  /** Defaults to a fresh `fakeHostServices()`. */
  readonly host?: H;
  /** Initial router location. Defaults to `/`. */
  readonly route?: string;
  /** Rendered while lazy components load. */
  readonly fallback?: ReactNode;
}

/** Renders inside `HostProvider`, a `MemoryRouter` and `Suspense`. */
const renderWithHost = <H extends HostServices = FakeHostServices>(
  ui: ReactElement,
  options: RenderWithHostOptions<H> = {},
): RenderResult & { readonly host: H } => {
  const { host: given, route = '/', fallback = null, ...rest } = options;
  const host = (given ?? fakeHostServices()) as H;
  const result = render(
    <HostProvider services={host}>
      <MemoryRouter initialEntries={[route]}>
        <Suspense fallback={fallback}>{ui}</Suspense>
      </MemoryRouter>
    </HostProvider>,
    rest,
  );
  return { ...result, host };
};

export default renderWithHost;
