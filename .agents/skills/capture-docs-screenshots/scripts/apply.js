// Copy captured screenshots over the documentation images they replace.
// Usage: node apply.js <capture-directory>
const fs = require('node:fs');
const path = require('node:path');
const { IMAGES } = require('./images');

const REPO_ROOT = path.resolve(__dirname, '../../../..');

// Returns the captures that were missing, so a partial run is visible.
function applyCaptures(captureDir, repoRoot = REPO_ROOT, images = IMAGES) {
  const missing = [];
  for (const [name, targets] of Object.entries(images)) {
    const source = path.join(captureDir, name);
    if (!fs.existsSync(source)) {
      missing.push(name);
      continue;
    }
    for (const target of targets) {
      fs.copyFileSync(source, path.join(repoRoot, target));
    }
  }
  return missing;
}

if (require.main === module) {
  const dir = process.argv[2];
  if (!dir) {
    console.error('usage: node apply.js <capture-directory>');
    process.exit(2);
  }
  const missing = applyCaptures(path.resolve(dir));
  missing.forEach((name) => console.log(`missing: ${name}`));
  process.exit(missing.length ? 1 : 0);
}

module.exports = { applyCaptures };
