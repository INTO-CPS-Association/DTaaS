import type { DtaasExtension } from '@into-cps-association/dtaas-sdk';

/**
 * Every domain extension compiled into this client, in menu order.
 *
 * Empty in the local preview: every domain extension comes from its kit as a
 * deployed bundle, listed in REACT_APP_EXTENSIONS_DEPLOYED in env.js, so the
 * client carries no domain code that could drift from the kit.
 */
const extensions: readonly DtaasExtension[] = [];

export default extensions;
