/**
 * The Building Models route.
 *
 * Loading a model, drawing it and colouring it by sensor reading all live in
 * `@into-cps-association/bim-kit`, so a change to any of them is a version of
 * that package and never a pull request against DTaaS. What stays here is the
 * wiring only this application can supply: its layout, the address of the
 * signed-in user's library, the folder models live in (`library.ts`), and the
 * write that stores a converted model (`persistGeometry.ts`).
 *
 * That address comes from the deployment's own configuration through
 * `useURLforLIB`, so this file carries no host, no path and no user name.
 * `README.md` beside it describes the rest.
 */

import { useCallback, useEffect, useRef } from 'react';
import { Box, CircularProgress, Link, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import {
  BuildingModels,
  type BimModel,
} from '@into-cps-association/bim-kit/react';
import Layout from 'page/Layout';
import PageShell from 'components/PageShell';
import { useURLforLIB, useUsername } from 'util/envUtil';
import { uploadGeometry } from 'route/bim/persistGeometry';
import MODELS_DIRECTORY from 'route/bim/library';

/** One line saying what the page is for, in the frame every page shares. */
const DESCRIPTION =
  'IFC models in your library, drawn in the browser and coloured by the ' +
  'readings their sensors report.';

function Bim() {
  const libraryUrl = useURLforLIB();
  const username = useUsername();

  // Store a browser-converted model back in the library, so switching away and
  // back does not convert it again. The viewer hands over the GLB; this knows
  // the library address and writes it there.
  //
  // A failure costs a reconversion and nothing else, so it does not reach the
  // screen. It is written to the console first, because the failure that
  // matters is invisible otherwise: a workspace with Jupyter XSRF protection
  // enabled sets an HttpOnly `_xsrf` cookie, which script cannot read, so the
  // header is omitted and every write is refused. Without this line that
  // deployment looks exactly like one where the feature works.
  //
  // A write still running when the person leaves the page is stopped, and the
  // model converts again on the next visit. The ref holds the controller for
  // the page as it is mounted now, which the effect replaces on every mount.
  const leaving = useRef(new AbortController());
  useEffect(() => {
    const controller = new AbortController();
    leaving.current = controller;
    return () => controller.abort();
  }, []);

  const persistGeometry = useCallback(
    (model: BimModel, glb: Uint8Array) =>
      uploadGeometry(
        libraryUrl,
        model.ifcPath,
        glb,
        leaving.current.signal,
      ).catch((error: Error) => {
        // eslint-disable-next-line no-console
        console.debug('The conversion was not stored.', model.ifcPath, error);
        throw error;
      }),
    [libraryUrl],
  );

  // Wait for the name before handing the viewer an address built from it.
  // `useUsername` reads it from the sign-in profile on the first render, so
  // this is only reached when no user is signed in yet. An address without
  // the name is answered by the catch-all route with this application's own
  // HTML and HTTP 200, and the viewer would report that the library did not
  // return JSON, which is true and is not the problem. Every hook above runs
  // first, so this early return does not change the order they are called in.
  if (!username) {
    return (
      <Layout>
        <PageShell title="Building Models" description={DESCRIPTION}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: 3 }}>
            <CircularProgress size={20} />
            <Typography variant="body2">
              Waiting for the signed-in user.
            </Typography>
          </Box>
        </PageShell>
      </Layout>
    );
  }

  return (
    <Layout sx={{ display: 'flex' }}>
      <PageShell title="Building Models" description={DESCRIPTION}>
        {/* The path reads as part of the sentence, so it is set in the same
            face as the sentence. In a monospace face it looked like something
            to be typed, when it is a place to go and the link already says so. */}
        <Typography variant="body2" sx={{ mb: 2 }}>
          Models are uploaded to the shared library under{' '}
          <Link component={RouterLink} to="/library">
            {MODELS_DIRECTORY}
          </Link>
          .
        </Typography>
        {/* The folder is DTaaS's to name, so it is handed to the viewer and
            not left to a default inside the package. */}
        <BuildingModels
          libraryUrl={libraryUrl}
          directory={MODELS_DIRECTORY}
          onPersistGeometry={persistGeometry}
        />
      </PageShell>
    </Layout>
  );
}

export default Bim;
