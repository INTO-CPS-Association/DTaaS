/**
 * A file of the library, shown by the extension that previews its type, at
 * `/library/preview?file=<path in the library>`. The extension's previewer
 * gets a fetchable address of the file and its name.
 */

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import { HostProvider } from '@into-cps-association/dtaas-sdk';
import Layout from 'page/Layout';
import PageShell from 'components/PageShell';
import ErrorBoundary from 'components/ErrorBoundary';
import extensionHost, {
  hostFor,
  sharedServices,
} from 'extension/extensionHost';
import type { MountedPreview } from 'extension/createExtensionHost';

const suffixOf = (file: string) => {
  const dot = file.lastIndexOf('.');
  return dot === -1 ? '' : file.slice(dot).toLowerCase();
};

/** The first previewer whose extensions name the file's suffix. */
export function previewFor(
  previews: readonly MountedPreview[],
  file: string,
): MountedPreview | undefined {
  const suffix = suffixOf(file);
  return previews.find(({ preview }) =>
    (preview.extensions ?? []).some((ext) => ext.toLowerCase() === suffix),
  );
}

/** The address of a library file, or that the path was refused. */
function useFileUrl(file: string) {
  const [url, setUrl] = useState<{ file: string; url?: string }>();
  useEffect(() => {
    sharedServices.library
      .resolve(`lib://${file}`)
      .then((resolved) => setUrl({ file, url: resolved }))
      .catch(() => setUrl({ file }));
  }, [file]);
  return url?.file === file ? url : undefined;
}

function Preview({ mounted, file }: { mounted: MountedPreview; file: string }) {
  const resolved = useFileUrl(file);
  if (!resolved) return <CircularProgress sx={{ m: 2 }} />;
  if (!resolved.url) {
    return <Alert severity="error">{file} is not a library file.</Alert>;
  }
  const Page = mounted.preview.element;
  const name = file.slice(file.lastIndexOf('/') + 1);
  return (
    <ErrorBoundary>
      <HostProvider services={hostFor(mounted.extension)}>
        <Suspense fallback={<CircularProgress sx={{ m: 2 }} />}>
          <Page url={resolved.url} name={name} />
        </Suspense>
      </HostProvider>
    </ErrorBoundary>
  );
}

function AssetPreviewPage() {
  const [params] = useSearchParams();
  const file = params.get('file') ?? '';
  const mounted = previewFor(extensionHost.assetPreviews, file);
  return (
    <Layout>
      <PageShell title="Preview" description={file}>
        {mounted ? (
          <Preview mounted={mounted} file={file} />
        ) : (
          <Alert severity="info">No extension previews {file || 'this'}.</Alert>
        )}
      </PageShell>
    </Layout>
  );
}

export default AssetPreviewPage;
