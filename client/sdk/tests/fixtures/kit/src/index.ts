import { lazy } from 'react';
import ScienceIcon from '@mui/icons-material/Science';
import { defineExtension } from '@into-cps-association/dtaas-extensions';

// The smallest extension a deployed bundle can carry: one page and one menu
// entry with an icon, so a build shows that the icon plugin keeps only that
// icon and that the page is split into a chunk of its own.
export const extension = defineExtension({
  id: 'fixture',
  name: 'Fixture',
  version: '0.1.0',
  sdk: 1,
  routes: [{ path: '', element: lazy(() => import('./pages/FixturePage')) }],
  navigation: [
    { label: 'Fixture', path: '/fixture', icon: ScienceIcon, order: 100 },
  ],
  setup: (host) => {
    host.logger.info('fixture ready');
  },
});

export default extension;
