// Inter, the typeface the Material-UI dashboard template sets. Only the four
// weights the type scale uses: importing the family would ship nine files
// where four are read.
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';

import type { EnvRecord } from '@into-cps-association/dtaas-sdk';
import { prepareDeployedExtensions } from 'extension/deployedExtensions';

/** Say in the page that the client did not start, where it would have drawn. */
function showStartFailure(): void {
  const root = document.getElementById('root');
  if (root) {
    root.textContent =
      'The client could not start. Reload the page, and contact the administrator if this message stays.';
  }
}

// The deployed extensions load before the client's own modules, because the
// store and the routes read the extension registry when they are imported.
// A fault while loading them does not stop the client, and a fault in the
// client's own start is shown in the page instead of leaving it blank.
prepareDeployedExtensions((globalThis.env ?? {}) as EnvRecord)
  .then(() => import('startClient'))
  .then(({ default: startClient }) => startClient())
  .catch(showStartFailure);
