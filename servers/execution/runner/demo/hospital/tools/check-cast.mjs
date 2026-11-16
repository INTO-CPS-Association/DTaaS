// node tools/check-cast.mjs: checks each pair of casts of record.mjs,
// demo-<platform>-manager.cast and demo-<platform>-network.cast, that is
// in the folder. Each must be valid asciicast v2: a JSON header, then
// one JSON event per line with a time that never goes back, a known
// type and a string. The two casts of a pair must have the same height
// and end at the same time, as they play side by side.
import { existsSync, readFileSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const problems = [];

function check(name) {
  const file = fileURLToPath(new URL(`../${name}`, import.meta.url));
  const [first, ...lines] = readFileSync(file, 'utf8').trimEnd().split('\n');
  const header = JSON.parse(first);
  if (header.version !== 2 || !header.width || !header.height) {
    problems.push(`${name}: the header is not that of asciicast v2`);
  }
  let clock = 0;
  let longestGap = 0;
  const counts = {};
  lines.forEach((line, index) => {
    const [time, type, data] = JSON.parse(line);
    if (typeof time !== 'number' || time < clock) {
      problems.push(`${name} line ${index + 2}: time ${time} goes back`);
    }
    if (!['o', 'm'].includes(type) || typeof data !== 'string') {
      problems.push(`${name} line ${index + 2}: not an output or marker`);
    }
    longestGap = Math.max(longestGap, time - clock);
    clock = time;
    counts[type] = (counts[type] ?? 0) + 1;
  });
  console.log(
    `${name}: ${statSync(file).size} bytes, ${header.width}x${header.height},` +
      ` ${clock.toFixed(1)} s, events ${JSON.stringify(counts)},` +
      ` longest gap ${longestGap.toFixed(2)} s`,
  );
  return { end: clock, height: header.height };
}

function checkPair(platform) {
  const names = ['manager', 'network'].map(
    (pane) => `demo-${platform}-${pane}.cast`,
  );
  const found = names.filter((name) =>
    existsSync(fileURLToPath(new URL(`../${name}`, import.meta.url))),
  );
  if (found.length === 0) {
    return false;
  }
  if (found.length === 1) {
    problems.push(`${found[0]} has no twin`);
    return true;
  }
  const [manager, network] = names.map(check);
  if (manager.end !== network.end || manager.height !== network.height) {
    problems.push(`the casts of ${platform} differ in end time or height`);
  }
  return true;
}

const checked = ['windows', 'linux'].filter(checkPair);
if (checked.length === 0) {
  problems.push('no demo-<platform>-*.cast found');
}
problems.forEach((problem) => console.error(problem));
process.exitCode = problems.length === 0 ? 0 : 1;
