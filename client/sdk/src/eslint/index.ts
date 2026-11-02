import type { Linter } from 'eslint';

const SDK = '@into-cps-association/dtaas-sdk';
const HOST = '@into-cps-association/dtaas-web';
const CORE = '@into-cps-association/dtaas-visualisation';

const USE_SIGNALS =
  'Extensions never open their own connections; use HostServices.signals instead.';

const CORE_MESSAGE = `Only ${CORE}/contribute/* is public to extensions.`;

const SOCKET_LIBRARIES = [
  'mqtt',
  'mqtt/*',
  '@stomp/stompjs',
  '@influxdata/influxdb-client',
  '@influxdata/influxdb-client/*',
  'socket.io-client',
  'ws',
];

const importPatterns = [
  {
    group: [HOST, `${HOST}/**`],
    message: `Extensions never import the host; use HostServices from ${SDK}.`,
  },
  {
    // gitignore semantics: re-including works for a child of CORE, not CORE itself.
    group: [`${CORE}/*`, `!${CORE}/contribute`],
    message: CORE_MESSAGE,
  },
  { group: SOCKET_LIBRARIES, message: USE_SIGNALS },
];

/** esquery selector for `import('<source>')` whose source matches `pattern`. */
const dynamicImport = (pattern: string, message: string) => ({
  selector: `ImportExpression[source.value=/${pattern}/]`,
  message,
});

// The same boundaries for import(), the idiom this contract uses for lazy code.
const dynamicImports = [
  dynamicImport(
    '^(mqtt|@stomp\\/stompjs|@influxdata\\/influxdb-client|socket\\.io-client|ws)(\\/|$)',
    USE_SIGNALS,
  ),
  dynamicImport(
    '^@into-cps-association\\/dtaas-web(\\/|$)',
    `Extensions never import the host; use HostServices from ${SDK}.`,
  ),
  dynamicImport(
    '^@into-cps-association\\/dtaas-visualisation(\\/(?!contribute(\\/|$))|$)',
    CORE_MESSAGE,
  ),
];

const socketGlobals = ['WebSocket', 'EventSource'];

const propertyRestrictions = [
  ...['globalThis', 'window', 'self'].flatMap((object) => [
    {
      object,
      property: 'env',
      message:
        'Declare a config schema and read it with HostServices.config().',
    },
    ...socketGlobals.map((property) => ({
      object,
      property,
      message: USE_SIGNALS,
    })),
  ]),
];

/**
 * Where an extension may reach (architecture §6.3). Spread it into a kit's
 * `eslint.config.mjs`; it uses core ESLint rules only. A later config that
 * sets the same rules replaces these options and does not merge with them.
 * airbnb-base sets `no-restricted-syntax`, so spread this config after it.
 */
const dtaasKitConfig: Linter.Config[] = [
  {
    name: `${SDK}/kit`,
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [{ name: CORE, message: CORE_MESSAGE }],
          patterns: importPatterns,
        },
      ],
      'no-restricted-globals': [
        'error',
        ...socketGlobals.map((name) => ({ name, message: USE_SIGNALS })),
      ],
      'no-restricted-properties': ['error', ...propertyRestrictions],
      'no-restricted-syntax': ['error', ...dynamicImports],
    },
  },
];

export default dtaasKitConfig;
