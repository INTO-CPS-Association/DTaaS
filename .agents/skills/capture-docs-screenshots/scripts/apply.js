// Copy captured screenshots over the documentation images they replace.
// Usage: node apply.js <capture-directory>
const fs = require('node:fs');
const path = require('node:path');
const { IMAGES } = require('./images');

const REPO_ROOT = path.resolve(__dirname, '../../../..');

// Copy one capture over every documentation image it replaces.
function copyCapture(source, targets, repoRoot) {
  targets.forEach((target) => {
    fs.copyFileSync(source, path.join(repoRoot, target));
  });
}

// Returns the captures that were missing, so a partial run is visible.
function applyCaptures(captureDir, repoRoot = REPO_ROOT, images = IMAGES) {
  const captured = (name) => fs.existsSync(path.join(captureDir, name));
  const names = Object.keys(images);
  names.filter(captured).forEach((name) => {
    copyCapture(path.join(captureDir, name), images[name], repoRoot);
  });
  return names.filter((name) => !captured(name));
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
