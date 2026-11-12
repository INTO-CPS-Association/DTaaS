import { mkdtempSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// Every test reads an empty configuration file, so a signals.yaml next to the
// code, which the README tells people to create, never changes a test.
const folder = mkdtempSync(path.join(os.tmpdir(), 'dtaas-signals-test-'));
const file = path.join(folder, 'signals.yaml');
writeFileSync(file, '', 'utf8');
process.env.SIGNALS_CONFIG_PATH = file;
