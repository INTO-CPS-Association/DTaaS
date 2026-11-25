/**
 * Extension ids this client keeps for itself.
 *
 * An extension mounts its pages under `/<id>` and its Redux slice under
 * `state.ext.<id>`, so an id must not be the first segment of a core route in
 * `src/routes.tsx` or a key the host uses for its own state. The list lives in
 * the host because it follows the host's route table. The contract package
 * only checks the shape of an id and receives this list through
 * `validateExtension(ext, { reservedIds })`.
 */
const RESERVED_EXTENSION_IDS: readonly string[] = [
  'config',
  'library',
  'digitaltwins',
  'automation',
  'account',
  'workbench',
  'preview',
  'insights',
  // Host-owned state keys: the extension slices and the visualisation state.
  'ext',
  'viz',
];

export default RESERVED_EXTENSION_IDS;
