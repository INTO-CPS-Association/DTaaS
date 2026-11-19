import type { DtaasExtension } from '@into-cps-association/dtaas-sdk';
import { extension as bim } from '@into-cps-association/bim-kit/dtaas';

/**
 * Every domain extension compiled into this client, in menu order.
 *
 * Adding one is two changes: `yarn add` its package and import its
 * `extension` here. Removing one is the reverse. A deployment can still hide a
 * compiled-in extension without a rebuild, through `REACT_APP_EXTENSIONS_DISABLED`
 * in `env.js`.
 *
 * The client must still build and pass its tests with the list empty.
 */
const extensions: readonly DtaasExtension[] = [bim];

export default extensions;
