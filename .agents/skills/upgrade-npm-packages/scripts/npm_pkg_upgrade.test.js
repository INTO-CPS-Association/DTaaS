// Run with: node --test ./*.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const {
  parseSpec,
  compareVersions,
  rangeCeiling,
  pickVersion,
  planUpgrades,
  applyPlan,
  reportLines,
} = require('./npm_pkg_upgrade');

const CUTOFF = new Date('2026-10-01T00:00:00Z');

function packument(entries) {
  const versions = {};
  const time = {};
  entries.forEach(([version, date, deprecated]) => {
    versions[version] = deprecated ? { deprecated: 'do not use' } : {};
    time[version] = date;
  });
  return { versions, time };
}

const LIB = packument([
  ['1.0.0', '2026-01-01T00:00:00Z'],
  ['1.10.0', '2026-09-01T00:00:00Z'],
  ['1.11.0', '2026-09-20T00:00:00Z', true],
  ['2.0.0-beta.1', '2026-09-25T00:00:00Z'],
  ['2.0.0', '2026-10-05T00:00:00Z'],
]);

test('parseSpec keeps the range prefix of plain versions', () => {
  assert.deepEqual(parseSpec('^1.2.3'), { prefix: '^', version: '1.2.3' });
  assert.deepEqual(parseSpec('1.2.3'), { prefix: '', version: '1.2.3' });
  assert.equal(parseSpec('>=1.2.3'), null);
  assert.equal(parseSpec('file:../lib'), null);
  assert.equal(parseSpec('1.0.0-rc.1'), null);
});

test('compareVersions orders numerically, not lexically', () => {
  assert.ok(compareVersions('1.10.0', '1.9.0') > 0);
  assert.equal(compareVersions('2.0.0', '2.0.0'), 0);
});

test('pickVersion skips recent, deprecated and prerelease versions', () => {
  assert.equal(pickVersion(LIB, CUTOFF), '1.10.0');
  assert.equal(pickVersion(LIB, new Date('2025-01-01')), null);
});

test('planUpgrades upgrades, downgrades and skips', async () => {
  const pkg = {
    dependencies: { lib: '^1.0.0', local: 'file:../local' },
    devDependencies: { fresh: '2.0.0' },
  };
  const fetcher = async () => LIB;
  const plan = await planUpgrades(pkg, CUTOFF, fetcher);
  const byName = Object.fromEntries(plan.map((e) => [e.name, e]));
  assert.equal(byName.lib.to, '^1.10.0');
  assert.equal(byName.fresh.to, '1.10.0');
  assert.equal(byName.fresh.downgrade, true);
  assert.match(byName.local.skipped, /plain/);
});

test('planUpgrades reports registry failures instead of throwing', async () => {
  const pkg = { dependencies: { gone: '^1.0.0' } };
  const fetcher = async () => {
    throw new Error('404');
  };
  const [entry] = await planUpgrades(pkg, CUTOFF, fetcher);
  assert.equal(entry.skipped, '404');
});

test('applyPlan writes only changed specs', () => {
  const pkg = { dependencies: { a: '^1.0.0', b: '^2.0.0' } };
  applyPlan(pkg, [
    { field: 'dependencies', name: 'a', spec: '^1.0.0', to: '^1.1.0' },
    { field: 'dependencies', name: 'b', spec: '^2.0.0', skipped: 'x' },
  ]);
  assert.deepEqual(pkg.dependencies, { a: '^1.1.0', b: '^2.0.0' });
});

test('planUpgrades leaves project packages alone', async () => {
  const pkg = { dependencies: { '@into-cps-association/x': '^0.2.0' } };
  const [entry] = await planUpgrades(pkg, CUTOFF, async () => LIB);
  assert.equal(entry.skipped, 'exempt from cooldown');
});

test('rangeCeiling follows the npm meaning of ^ and ~', () => {
  const ceiling = (spec) => rangeCeiling(parseSpec(spec));
  assert.equal(ceiling('^6.0.3'), '7.0.0');
  assert.equal(ceiling('6.0.3'), '7.0.0');
  assert.equal(ceiling('~30.4.2'), '30.5.0');
  assert.equal(ceiling('^0.18.9'), '0.19.0');
  assert.equal(ceiling('^0.0.4'), '0.0.5');
});

test('planUpgrades stays within the range and reports newer versions', async () => {
  const pkg = { dependencies: { lib: '^1.0.0', pinned: '~1.0.0' } };
  const cutoff = new Date('2026-10-10T00:00:00Z');
  const plan = await planUpgrades(pkg, cutoff, async () => LIB);
  const byName = Object.fromEntries(plan.map((e) => [e.name, e]));
  assert.equal(byName.lib.to, '^1.10.0');
  assert.equal(byName.lib.outside, '2.0.0');
  assert.equal(byName.pinned.to, '~1.0.0');
  assert.equal(byName.pinned.outside, '2.0.0');
});

test('reportLines reports skips, changes and newer versions', () => {
  const base = { name: 'lib', spec: '^1.0.0' };
  assert.deepEqual(reportLines({ ...base, skipped: 'why' }), [
    'skip     lib@^1.0.0: why',
  ]);
  assert.deepEqual(reportLines({ ...base, to: '^1.2.0', outside: '2.0.0' }), [
    'upgrade   lib: ^1.0.0 -> ^1.2.0',
    'newer    lib: 2.0.0 is outside ^1.0.0, not applied',
  ]);
  assert.deepEqual(reportLines({ ...base, to: '^0.9.0', downgrade: true }), [
    'DOWNGRADE lib: ^1.0.0 -> ^0.9.0',
  ]);
  assert.deepEqual(reportLines({ ...base, to: '^1.0.0' }), []);
});
