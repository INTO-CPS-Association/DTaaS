# hello-kit

The smallest complete DTaaS domain extension. Use it as the template layout
for a new kit.

| Path                            | Role                                                                     |
| ------------------------------- | ------------------------------------------------------------------------ |
| `src/core/`                     | Framework-free domain logic: twin detection, reading format, anchor refs |
| `src/react/Reading.tsx`         | A domain widget that knows nothing about DTaaS                           |
| `src/dtaas/index.ts`            | The `DtaasExtension` the host imports                                    |
| `src/dtaas/pages/HelloPage.tsx` | A lazy page that reads everything through `useHost()`                    |
| `src/dtaas/anchors.ts`          | The `hello-node` anchor kind (`node:<id>` on an `image` substrate)       |
| `src/dtaas/presets/`            | The `hello.warmth` colour-scale preset                                   |
| `src/dtaas/config.ts`           | Schema for `REACT_APP_EXT_HELLO_GREETING`                                |

The SDK's own test suite exercises the kit in
[`tests/integration/helloKit.test.tsx`](../../tests/integration/helloKit.test.tsx),
and the SDK's lint rules for kits are applied to this directory.

In this repository the kit imports its own modules through the `examples/*`
path alias; a standalone kit would use relative imports.
