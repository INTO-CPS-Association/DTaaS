import { KeyLinkPair } from 'util/envUtil';

/**
 * Where the project lives. Named here because the toolbar and the footer both
 * point at them, and a copy in each would drift.
 */
export const REPOSITORY_URL = 'https://github.com/INTO-CPS-Association/DTaaS';
export const DOCS_URL = 'https://into-cps-association.github.io/DTaaS';
export const ASSOCIATION_URL = 'https://into-cps.org/';

const toolbarLinkValues: KeyLinkPair[] = [
  {
    key: 'github',
    link: REPOSITORY_URL,
  },
  {
    key: 'help',
    link: DOCS_URL,
  },
];

export default toolbarLinkValues;
