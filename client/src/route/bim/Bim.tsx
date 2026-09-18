/**
 * The Building Models route.
 *
 * This file is the whole of what DTaaS knows about BIM. Loading a model,
 * drawing it and colouring it by sensor reading all live in
 * `@into-cps-association/bim-kit`, so a change to any of them is a
 * version of that package and never a pull request against DTaaS. What stays
 * here is the wiring only this application can supply: its layout, and the
 * address of the signed-in user's library.
 *
 * That address comes from the deployment's own configuration through
 * `useURLforLIB`, so this file carries no host, no path and no user name.
 * `README.md` beside it describes the rest.
 */

import { useCallback, useEffect } from 'react';
import { useAuth } from 'react-oidc-context';
import { useSelector } from 'react-redux';
import { Box, CircularProgress, Link, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import {
  BuildingModels,
  type BimModel,
} from '@into-cps-association/bim-kit/react';
import Layout from 'page/Layout';
import PageShell from 'components/PageShell';
import { useURLforLIB } from 'util/envUtil';
import { useGetAndSetUsername } from 'util/auth/Authentication';
import { RootState } from 'store/store';
import { uploadGeometry } from 'route/bim/persistGeometry';

/** One line saying what the page is for, in the frame every page shares. */
const DESCRIPTION =
  'IFC models in your library, drawn in the browser and coloured by the ' +
  'readings their sensors report.';

function Bim() {
  const auth = useAuth();
  const getAndSetUsername = useGetAndSetUsername();
  const libraryUrl = useURLforLIB();
  const username = useSelector((state: RootState) => state.auth.userName);

  // Store a browser-converted model back in the library, so switching away and
  // back does not convert it again. The viewer hands over the GLB; this knows
  // the library address and writes it there. A failure is the viewer's to
  // swallow: the model already drew, and it reconverts next time.
  const persistGeometry = useCallback(
    (model: BimModel, glb: Uint8Array) =>
      uploadGeometry(libraryUrl, model.ifcPath, glb),
    [libraryUrl],
  );

  // The library URL is built from the signed-in user name, which the store
  // only holds after this runs. Library and Digital Twins do the same thing
  // in the same place, so this route stays consistent with them instead of
  // inventing a second way to learn who is signed in.
  useEffect(() => {
    getAndSetUsername(auth);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth.user]);

  // Wait for the name before handing the viewer an address built from it.
  // `useURLforLIB` interpolates the name whether or not it is there, so on the
  // first render the address reads .../undefined/..., which the catch-all route
  // answers with this application's own HTML and HTTP 200. The viewer then
  // reports that the library did not return JSON, which is true and is not the
  // problem. Every hook above runs first, so this early return does not change
  // the order they are called in.
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
        <Typography variant="body2" sx={{ mb: 2 }}>
          Models are uploaded to the shared library under{' '}
          <Link component={RouterLink} to="/library">
            <code>common/models</code>
          </Link>
          .
        </Typography>
        <BuildingModels
          libraryUrl={libraryUrl}
          onPersistGeometry={persistGeometry}
        />
      </PageShell>
    </Layout>
  );
}

export default Bim;
