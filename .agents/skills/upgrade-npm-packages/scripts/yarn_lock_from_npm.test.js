// Run with: node --test ./*.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const { yarnLockFromNpm, resolvePath, quote } = require('./yarn_lock_from_npm');

const REGISTRY = 'https://registry.npmjs.org';

function tarball(name, version) {
  return {
    version,
    resolved: `${REGISTRY}/${name}/-/${name}-${version}.tgz`,
    integrity: `sha512-${name}${version}`,
  };
}

const NPM_LOCK = {
  lockfileVersion: 3,
  packages: {
    '': { dependencies: { a: '^1.0.0', b: '^1.0.0' } },
    'node_modules/a': {
      ...tarball('a', '1.2.0'),
      dependencies: { c: '^2.0.0' },
    },
    'node_modules/b': {
      ...tarball('b', '1.0.0'),
      dependencies: { c: '^1.0.0' },
    },
    'node_modules/b/node_modules/c': tarball('c', '1.5.0'),
    'node_modules/c': tarball('c', '2.1.0'),
  },
};

test('quote follows the yarn lockfile rules', () => {
  assert.equal(quote('katex@^0.18.9'), 'katex@^0.18.9');
  assert.equal(quote('@babel/core@^8.0.0'), '"@babel/core@^8.0.0"');
  assert.equal(quote('1.2.0'), '"1.2.0"');
  assert.equal(quote('https://x'), '"https://x"');
});

test('resolvePath prefers the nearest node_modules', () => {
  const { packages } = NPM_LOCK;
  assert.equal(
    resolvePath(packages, 'node_modules/b', 'c'),
    'node_modules/b/node_modules/c',
  );
  assert.equal(resolvePath(packages, 'node_modules/a', 'c'), 'node_modules/c');
  assert.equal(resolvePath(packages, '', 'missing'), null);
});

test('yarnLockFromNpm records the versions npm chose', () => {
  const lock = yarnLockFromNpm(NPM_LOCK);
  assert.match(lock, /^# yarn lockfile v1$/m);
  assert.match(lock, /^c@\^1\.0\.0:\n {2}version "1\.5\.0"$/m);
  assert.match(lock, /^c@\^2\.0\.0:\n {2}version "2\.1\.0"$/m);
  assert.match(
    lock,
    /^a@\^1\.0\.0:\n[\s\S]*?dependencies:\n {4}c "\^2\.0\.0"/m,
  );
});

test('yarnLockFromNpm merges ranges that share one version', () => {
  const npmLock = structuredClone(NPM_LOCK);
  npmLock.packages['node_modules/b'].dependencies.c = '^2.1.0';
  delete npmLock.packages['node_modules/b/node_modules/c'];
  assert.match(yarnLockFromNpm(npmLock), /^c@\^2\.0\.0, c@\^2\.1\.0:$/m);
});

test('yarnLockFromNpm rejects a missing required dependency', () => {
  const npmLock = structuredClone(NPM_LOCK);
  delete npmLock.packages['node_modules/c'];
  assert.throws(() => yarnLockFromNpm(npmLock), /needs missing c/);
});

test('yarnLockFromNpm rejects lockfile v1', () => {
  assert.throws(() => yarnLockFromNpm({ lockfileVersion: 1 }), /v2 or later/);
});
