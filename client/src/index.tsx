// Inter, the typeface the Material-UI dashboard template sets. Only the four
// weights the type scale uses: importing the family would ship nine files
// where four are read.
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';

import type { EnvRecord } from '@into-cps-association/dtaas-sdk';
import {
  loadDeployedExtensions,
  setDeployedExtensions,
} from 'extension/deployedExtensions';

// The deployed extensions load before the client's own modules, because the
// store and the routes read the extension registry when they are imported.
loadDeployedExtensions((globalThis.env ?? {}) as EnvRecord)
  .then(setDeployedExtensions)
  .then(() => import('startClient'))
  .then(({ default: startClient }) => startClient());
