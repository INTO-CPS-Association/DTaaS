import fs from 'node:fs';
import path from 'node:path';

/**
 * Patterns of a credential in the code a browser downloads. Each one is
 * named, and a finding reports only the name and the place, so a scan that
 * fails never prints the secret it found into a CI log.
 */
export const SECRET_PATTERNS: ReadonlyArray<{ name: string; pattern: RegExp }> =
  [
    {
      name: 'login in a URL (user:password@)',
      pattern: /\b[a-z][a-z0-9+.-]*:\/\/[^\s'"`/@:]+:[^\s'"`/@]+@[a-z0-9.-]/i,
    },
    {
      name: 'password with a value',
      pattern: /password["']?\s*[:=]\s*["'`][^"'`\s]{4,}["'`]/i,
    },
    {
      name: 'token or secret with a value',
      pattern:
        /(?:api[_-]?key|secret|access[_-]?token|auth[_-]?token)["']?\s*[:=]\s*["'`][\w.-]{16,}["'`]/i,
    },
    {
      name: 'GitLab token',
      pattern: /\b(?:glpat|gloas|gldt|glrt|glptt)-[A-Za-z0-9_-]{20,}/,
    },
    {
      name: 'private key',
      pattern: /-----BEGIN (?:[A-Z]+ )?PRIVATE KEY-----/,
    },
    // The broker login the client once read from env.js. The gateway holds
    // it now, so the name must not reach the browser at all.
    { name: 'VIZ_MQTT setting', pattern: /VIZ_MQTT_[A-Z_]+/ },
  ];

// Values a library ships on purpose, which look like a secret and are not.
// React's prop-types names this constant ReactPropTypesSecret.
const PUBLIC_VALUES: readonly string[] = [
  'SECRET_DO_NOT_PASS_THIS_OR_YOU_WILL_BE_FIRED',
];

function withoutPublicValues(line: string): string {
  return PUBLIC_VALUES.reduce(
    (text, value) => text.split(value).join(''),
    line,
  );
}

export type Finding = { file: string; line: number; pattern: string };

/** The findings in one text, by line, without the matched text. */
export function scanText(file: string, text: string): Finding[] {
  const findings: Finding[] = [];
  text.split('\n').forEach((line, index) => {
    const content = withoutPublicValues(line);
    SECRET_PATTERNS.forEach(({ name, pattern }) => {
      if (pattern.test(content)) {
        findings.push({ file, line: index + 1, pattern: name });
      }
    });
  });
  return findings;
}

const SCANNED = /\.(?:js|mjs|cjs|map|html|json|txt)$/;

/** Every file of the built client a browser can download. */
export function builtFiles(root: string): string[] {
  return fs
    .readdirSync(root, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile() && SCANNED.test(entry.name))
    .map((entry) => path.join(entry.parentPath, entry.name));
}

export function scanBuild(root: string): Finding[] {
  return builtFiles(root).flatMap((file) =>
    scanText(path.relative(root, file), fs.readFileSync(file, 'utf-8')),
  );
}
