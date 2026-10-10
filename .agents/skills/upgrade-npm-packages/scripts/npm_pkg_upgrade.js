#!/usr/bin/env node
/*
 * Upgrade the dependencies of a package.json to the newest versions that
 * have been on the npm registry for at least COOLDOWN_DAYS, then replace the
 * yarn.lock beside it with a freshly generated one. Each upgrade stays within
 * the range its spec already allows; newer versions outside it are only
 * reported. Packages published from this repository (see regenerate_lock.js)
 * keep their versions.
 *
 * Usage: node npm_pkg_upgrade.js <path/to/package.json>
 */
const fs = require('node:fs');
const path = require('node:path');
const { regenerateLock, isExempt } = require('./regenerate_lock');

const COOLDOWN_DAYS = 10;
const DAY_MS = 24 * 60 * 60 * 1000;
const REGISTRY = (
  process.env.npm_config_registry || 'https://registry.npmjs.org'
).replace(/\/$/, '');
const DEP_FIELDS = ['dependencies', 'devDependencies', 'optionalDependencies'];
const FETCH_CONCURRENCY = 8;
const SPEC_PATTERN = /^([\^~]?)(\d+\.\d+\.\d+)$/;
const STABLE_VERSION = /^\d+\.\d+\.\d+$/;

/** Split "^1.2.3" into its range prefix and version; null if not that form. */
function parseSpec(spec) {
  const match = SPEC_PATTERN.exec(spec);
  return match ? { prefix: match[1], version: match[2] } : null;
}

function compareVersions(a, b) {
  const left = a.split('.').map(Number);
  const right = b.split('.').map(Number);
  for (let i = 0; i < 3; i += 1) {
    if (left[i] !== right[i]) return left[i] - right[i];
  }
  return 0;
}

/*
 * The first version the spec's own range excludes: "~1.2.3" stops at 1.3.0
 * and "^1.2.3" at 2.0.0. An exact version is treated like "^", and "^0.y.z"
 * stops at the next minor, as npm does.
 */
function rangeCeiling({ prefix, version }) {
  const [major, minor, patch] = version.split('.').map(Number);
  if (prefix === '~') return `${major}.${minor + 1}.0`;
  if (major > 0) return `${major + 1}.0.0`;
  if (minor > 0) return `0.${minor + 1}.0`;
  return `0.0.${patch + 1}`;
}

/**
 * Newest stable, non-deprecated version published on or before cutoff and,
 * when a ceiling is given, below it.
 */
function pickVersion(packument, cutoff, ceiling = null) {
  const times = packument.time || {};
  const versions = packument.versions || {};
  return (
    Object.keys(versions)
      .filter((v) => STABLE_VERSION.test(v) && !versions[v].deprecated)
      .filter((v) => times[v] && new Date(times[v]) <= cutoff)
      .filter((v) => !ceiling || compareVersions(v, ceiling) < 0)
      .sort(compareVersions)
      .pop() || null
  );
}

async function fetchPackument(name) {
  const url = `${REGISTRY}/${name.replace('/', '%2f')}`;
  const response = await fetch(url, {
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) {
    throw new Error(`${url} answered ${response.status}`);
  }
  return response.json();
}

/** Run worker over items with at most limit calls in flight. */
async function mapLimit(items, limit, worker) {
  const results = new Array(items.length);
  let next = 0;
  async function run() {
    while (next < items.length) {
      const index = next;
      next += 1;
      results[index] = await worker(items[index]);
    }
  }
  await Promise.all(Array.from({ length: limit }, run));
  return results;
}

function listDependencies(pkg) {
  return DEP_FIELDS.flatMap((field) =>
    Object.entries(pkg[field] || {}).map(([name, spec]) => ({
      field,
      name,
      spec,
    })),
  );
}

/** Decide the new spec for one dependency, or why it is left alone. */
async function planOne(dep, cutoff, fetcher) {
  if (isExempt(dep.name)) return { ...dep, skipped: 'exempt from cooldown' };
  const parsed = parseSpec(dep.spec);
  if (!parsed) return { ...dep, skipped: 'not a plain x.y.z version' };
  let packument;
  try {
    packument = await fetcher(dep.name);
  } catch (error) {
    return { ...dep, skipped: error.message };
  }
  const chosen = pickVersion(packument, cutoff, rangeCeiling(parsed));
  if (!chosen) return { ...dep, skipped: 'no version old enough' };
  const newest = pickVersion(packument, cutoff);
  return {
    ...dep,
    to: parsed.prefix + chosen,
    downgrade: compareVersions(chosen, parsed.version) < 0,
    outside: newest === chosen ? null : newest,
  };
}

async function planUpgrades(pkg, cutoff, fetcher = fetchPackument) {
  return mapLimit(listDependencies(pkg), FETCH_CONCURRENCY, (dep) =>
    planOne(dep, cutoff, fetcher),
  );
}

function applyPlan(pkg, plan) {
  plan
    .filter((entry) => entry.to && entry.to !== entry.spec)
    .forEach((entry) => {
      pkg[entry.field][entry.name] = entry.to;
    });
  return pkg;
}

function report(plan) {
  plan.forEach((entry) => {
    if (entry.skipped) {
      console.log(`skip     ${entry.name}@${entry.spec}: ${entry.skipped}`);
      return;
    }
    if (entry.to !== entry.spec) {
      const label = entry.downgrade ? 'DOWNGRADE' : 'upgrade  ';
      console.log(`${label} ${entry.name}: ${entry.spec} -> ${entry.to}`);
    }
    if (entry.outside) {
      const note = `${entry.outside} is outside ${entry.spec}, not applied`;
      console.log(`newer    ${entry.name}: ${note}`);
    }
  });
}

async function main(argv) {
  if (argv.length !== 1) {
    throw new Error('usage: node npm_pkg_upgrade.js <path/to/package.json>');
  }
  const file = path.resolve(argv[0]);
  const pkg = JSON.parse(fs.readFileSync(file, 'utf8'));
  const cutoff = new Date(Date.now() - COOLDOWN_DAYS * DAY_MS);
  console.log(`Cooldown cutoff: ${cutoff.toISOString()}`);
  const plan = await planUpgrades(pkg, cutoff);
  report(plan);
  fs.writeFileSync(file, `${JSON.stringify(applyPlan(pkg, plan), null, 2)}\n`);
  regenerateLock(path.dirname(file), cutoff);
}

if (require.main === module) {
  main(process.argv.slice(2)).catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}

module.exports = {
  parseSpec,
  compareVersions,
  rangeCeiling,
  pickVersion,
  planUpgrades,
  applyPlan,
};
