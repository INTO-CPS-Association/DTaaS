// Builds a publishable archive, installs it in a clean temporary project, and verifies its public import.
import { execFileSync, execSync } from 'node:child_process';
import { copyFileSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// Command output remains visible so failures are easy to diagnose.
const run = (command, cwd) => {
  execSync(command, { cwd, stdio: 'inherit' });
};

// Paths are wrapped in quotes so spaces and shell-sensitive characters are safe.
const quote = (value) => {
  const escapedQuote = '\\';
  const escapedValue = value.replaceAll('"', `${escapedQuote}"`);
  return `"${escapedValue}"`;
};

// The public import uses the name declared in the package manifest.
const packageName = () => {
  const packageJson = readFileSync('package.json', 'utf8');
  return JSON.parse(packageJson).name;
};

// The checks run from the temporary project, so they import the installed archive.
const runConsumerChecks = (packageDirectory, temporaryDirectory) => {
  const script = 'smoke-consumer.mjs';
  copyFileSync(
    join(packageDirectory, 'scripts', script),
    join(temporaryDirectory, script),
  );
  execFileSync(process.execPath, [script, packageName()], {
    cwd: temporaryDirectory,
    stdio: 'inherit',
  });
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
    const archiveReference = `file:${archivePath}`;
    run(`yarn add ${quote(archiveReference)}`, temporaryDirectory);
    runConsumerChecks(packageDirectory, temporaryDirectory);
  } finally {
    rmSync(temporaryDirectory, { recursive: true, force: true });
  }
};

runSmokeTest();
