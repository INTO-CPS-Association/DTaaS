/**
 * One page of an extension, as the router mounts it.
 *
 * The page gets the client's layout, a spinner while its code downloads, and
 * the services of its own extension through the SDK's `HostProvider`. A page
 * that throws is contained by the error boundary, so one extension cannot take
 * the rest of the client down.
 */

import { Suspense } from 'react';
import CircularProgress from '@mui/material/CircularProgress';
import {
  HostProvider,
  type DtaasExtension,
  type LazyPage,
} from '@into-cps-association/dtaas-sdk';
import Layout from 'page/Layout';
import ErrorBoundary from 'components/ErrorBoundary';
import { hostFor } from 'extension/extensionHost';

interface ExtensionPageProps {
  readonly extension: DtaasExtension;
  readonly page: LazyPage;
}

function ExtensionPage({ extension, page: Page }: ExtensionPageProps) {
  const services = hostFor(extension);
  return (
    <Layout>
      <ErrorBoundary>
        <HostProvider services={services}>
          <Suspense fallback={<CircularProgress sx={{ m: 4 }} />}>
            <Page />
          </Suspense>
        </HostProvider>
      </ErrorBoundary>
    </Layout>
  );
}

export default ExtensionPage;
