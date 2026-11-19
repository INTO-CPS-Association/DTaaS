import type { AnchorKindSpec } from '@into-cps-association/dtaas-sdk';
import { parseNodeRef } from 'examples/hello-kit/src/core';

/** `hello-node` anchors name a node on a photograph: `node:<id>`. */
const anchorKinds: AnchorKindSpec[] = [
  {
    kind: 'hello-node',
    label: 'Hello node',
    substrates: ['image'],
    validateRef: (ref) => parseNodeRef(ref) !== undefined,
    resolve: (anchor, adapter) => {
      const id = parseNodeRef(anchor.ref);
      return id === undefined ? null : { substrate: adapter.id, id };
    },
  },
];

export default anchorKinds;
