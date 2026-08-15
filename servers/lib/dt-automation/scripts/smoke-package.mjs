// Builds a publishable archive, installs it in a clean temporary project, and verifies its public import.
import { execFileSync, execSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// Command output remains visible so failures are easy to diagnose.
const run = (command, cwd) => {
  execSync(command, { cwd, stdio: 'inherit' });
};

// Paths are wrapped in quotes so spaces and shell-sensitive characters are safe.
const quote = (value) => `"${value.replaceAll('"', '\\"')}"`;

// The public import uses the name declared in the package manifest.
const packageName = () => {
  const packageJson = readFileSync('package.json', 'utf8');
  return JSON.parse(packageJson).name;
};

// The test recreates how an external consumer installs and imports the package.
const runSmokeTest = () => {
  const packageDirectory = process.cwd();
  const temporaryDirectory = mkdtempSync(
    join(tmpdir(), 'dt-automation-smoke-'),
  );
  const archivePath = join(temporaryDirectory, 'package.tgz');

  try {
    run(`yarn pack --filename ${quote(archivePath)}`, packageDirectory);
    run('yarn init -y', temporaryDirectory);
    run(
      'yarn add file:package.tgz react@19.2.0 react-redux@9.2.0',
      temporaryDirectory,
    );
    execFileSync(
      process.execPath,
      [
        '--input-type=module',
        '--eval',
        `import { formatName } from '${packageName()}'; if (formatName('digital-twin') !== 'Digital twin') throw new Error('Package smoke test failed');`,
      ],
      { cwd: temporaryDirectory, stdio: 'inherit' },
    );
  } finally {
    rmSync(temporaryDirectory, { recursive: true, force: true });
  }
};

runSmokeTest();
