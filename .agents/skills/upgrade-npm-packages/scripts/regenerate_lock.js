/*
 * Replace the yarn.lock beside a package.json with one whose every version
 * was published before a cutoff date.
 *
 * Yarn 1 cannot hold back recently published versions, so npm resolves the
 * whole tree as of the cutoff (--before covers transitive dependencies too)
 * and the result is converted into a yarn.lock. A frozen yarn install then
 * proves yarn accepts that lockfile without resolving anything itself. All
 * of it runs in an empty directory, away from any existing node_modules.
 */
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { yarnLockFromNpm } = require('./yarn_lock_from_npm');

// Packages built and published from this repository skip the cooldown.
const EXEMPT_SCOPE = '@into-cps-association/';
const DEP_FIELDS = ['dependencies', 'devDependencies', 'optionalDependencies'];
const NPM_INSTALL_ARGS = [
  'install',
  '--package-lock-only',
  '--ignore-scripts',
  '--legacy-peer-deps',
  '--no-audit',
  '--no-fund',
];
const REGISTRY_CONFIG_FILES = ['.npmrc', '.yarnrc'];

function isExempt(name) {
  return name.startsWith(EXEMPT_SCOPE);
}

/** A copy of pkg without the exempt dependencies. */
function withoutExempt(pkg) {
  const copy = structuredClone(pkg);
  DEP_FIELDS.filter((field) => copy[field]).forEach((field) => {
    Object.keys(copy[field])
      .filter(isExempt)
      .forEach((name) => delete copy[field][name]);
  });
  return copy;
}

/** The name@version of every package in a package-lock.json. */
function lockedVersions(npmLock) {
  return new Set(
    Object.entries(npmLock.packages)
      .filter(([treePath]) => treePath !== '')
      .map(([treePath, entry]) => {
        const name = entry.name || treePath.split('node_modules/').pop();
        return `${name}@${entry.version}`;
      }),
  );
}

/* Arguments are fixed strings from this script, never user input. */
function run(command, args, cwd) {
  const commandLine = [command, ...args].join(' ');
  console.log(`> ${commandLine}`);
  // npm and yarn are .cmd shims on Windows, which only a shell can start.
  const result = spawnSync(commandLine, { cwd, stdio: 'inherit', shell: true });
  if (result.status !== 0) {
    throw new Error(`${commandLine} failed in ${cwd}`);
  }
}

function writeJson(file, value) {
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

/*
 * Resolve the tree as of the cutoff without the exempt packages, then let a
 * second npm run add them, keeping every version the first run locked.
 * Anything the second run adds is reported, since it skipped the cooldown.
 */
function resolveTree(workDir, pkg, cutoff) {
  const npmLockFile = path.join(workDir, 'package-lock.json');
  const before = `--before=${cutoff.toISOString()}`;
  writeJson(path.join(workDir, 'package.json'), withoutExempt(pkg));
  run('npm', [...NPM_INSTALL_ARGS, before], workDir);
  const cooled = lockedVersions(readJson(npmLockFile));
  writeJson(path.join(workDir, 'package.json'), pkg);
  run('npm', NPM_INSTALL_ARGS, workDir);
  const npmLock = readJson(npmLockFile);
  [...lockedVersions(npmLock)]
    .filter((version) => !cooled.has(version))
    .forEach((version) => console.log(`no cooldown: ${version}`));
  return npmLock;
}

const YARN_FROZEN_INSTALL_ARGS = [
  'install',
  '--frozen-lockfile',
  '--ignore-scripts',
  '--network-timeout',
  '600000',
];

function copyRegistryConfig(fromDir, toDir) {
  REGISTRY_CONFIG_FILES.filter((name) =>
    fs.existsSync(path.join(fromDir, name)),
  ).forEach((name) =>
    fs.copyFileSync(path.join(fromDir, name), path.join(toDir, name)),
  );
}

function regenerateLock(dir, cutoff) {
  const workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'npm-pkg-upgrade-'));
  const yarnLock = path.join(workDir, 'yarn.lock');
  try {
    copyRegistryConfig(dir, workDir);
    const pkg = readJson(path.join(dir, 'package.json'));
    fs.writeFileSync(
      yarnLock,
      yarnLockFromNpm(resolveTree(workDir, pkg, cutoff)),
    );
    run('yarn', YARN_FROZEN_INSTALL_ARGS, workDir);
    fs.rmSync(path.join(dir, 'yarn.lock'), { force: true });
    fs.copyFileSync(yarnLock, path.join(dir, 'yarn.lock'));
  } finally {
    fs.rmSync(workDir, { recursive: true, force: true });
  }
}

module.exports = { regenerateLock, isExempt, withoutExempt, lockedVersions };
