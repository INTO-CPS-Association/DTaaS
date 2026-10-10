// Run with: node --test ./*.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const {
  isExempt,
  withoutExempt,
  lockedVersions,
} = require('./regenerate_lock');

test('isExempt matches only the project scope', () => {
  assert.equal(isExempt('@into-cps-association/dt-automation'), true);
  assert.equal(isExempt('@into-cps-association-fake/x'), false);
  assert.equal(isExempt('react'), false);
});

test('withoutExempt drops project packages and leaves the input intact', () => {
  const pkg = {
    dependencies: { '@into-cps-association/dt-automation': '^0.2.0', a: '1' },
    devDependencies: { b: '2' },
  };
  assert.deepEqual(withoutExempt(pkg), {
    dependencies: { a: '1' },
    devDependencies: { b: '2' },
  });
  assert.ok(pkg.dependencies['@into-cps-association/dt-automation']);
});

test('lockedVersions lists nested and aliased packages', () => {
  const versions = lockedVersions({
    packages: {
      '': { version: '1.0.0' },
      'node_modules/a': { version: '1.0.0' },
      'node_modules/a/node_modules/@s/b': { version: '2.0.0' },
      'node_modules/alias': { name: 'real', version: '3.0.0' },
    },
  });
  assert.deepEqual([...versions].sort(), [
    '@s/b@2.0.0',
    'a@1.0.0',
    'real@3.0.0',
  ]);
});
