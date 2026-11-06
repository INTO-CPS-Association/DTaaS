import { lazy } from 'react';
import { defineExtension } from '@into-cps-association/dtaas-sdk';
import { isHelloTwin } from 'examples/hello-kit/src/core';
import anchorKinds from 'examples/hello-kit/src/dtaas/anchors';
import configSchema from 'examples/hello-kit/src/dtaas/config';
import presets from 'examples/hello-kit/src/dtaas/presets';

/** The only object the host imports: `import { extension } from '<kit>/dtaas'`. */
export const extension = defineExtension({
  id: 'hello',
  name: 'Hello',
  version: '0.1.0',
  sdk: 1,
  routes: [
    {
      path: '',
      element: lazy(
        () => import('examples/hello-kit/src/dtaas/pages/HelloPage'),
      ),
    },
  ],
  navigation: [{ label: 'Hello', path: '/hello', order: 100 }],
  config: { schema: configSchema },
  setup: (host) => {
    host.config(configSchema);
    host.logger.info('hello-kit ready');
  },
  visualisation: { detect: isHelloTwin, anchorKinds, presets },
});

export default extension;
