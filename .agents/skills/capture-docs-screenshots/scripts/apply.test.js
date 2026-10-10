const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { applyCaptures } = require('./apply');
const { IMAGES, UNREFERENCED } = require('./images');

const REPO_ROOT = path.resolve(__dirname, '../../../..');
const TARGETS = Object.values(IMAGES).flat();

// A docs image is shown by any page in the section above it; an image
// elsewhere, such as a server's README, by a page beside it.
function markdownNear(target) {
  const dir = path.join(REPO_ROOT, path.dirname(target));
  const inDocs = target.startsWith('docs/');
  const pagesDir = inDocs ? path.join(dir, '..') : dir;
  return fs
    .readdirSync(pagesDir, { recursive: inDocs })
    .filter((file) => file.endsWith('.md'))
    .map((file) => fs.readFileSync(path.join(pagesDir, file), 'utf8'))
    .join('\n');
}

const isShown = (target) =>
  markdownNear(target).includes(path.basename(target));

test('every target sits in an existing directory', () => {
  for (const target of TARGETS) {
    const dir = path.join(REPO_ROOT, path.dirname(target));
    assert.ok(fs.existsSync(dir), target);
  }
});

test('no documentation image has two sources', () => {
  assert.strictEqual(new Set(TARGETS).size, TARGETS.length);
});

test('every target is referenced from the markdown near it', () => {
  for (const target of TARGETS) {
    if (!UNREFERENCED.includes(target)) assert.ok(isShown(target), target);
  }
});

test('the unreferenced list names only unreferenced targets', () => {
  for (const target of UNREFERENCED) {
    assert.ok(TARGETS.includes(target), target);
    assert.ok(!isShown(target), target);
  }
});

test('applyCaptures copies present captures and reports missing ones', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'apply-'));
  fs.mkdirSync(path.join(root, 'docs'));
  fs.writeFileSync(path.join(root, 'a.png'), 'new');
  const images = {
    'a.png': ['docs/x.png', 'docs/y.png'],
    'b.png': ['docs/z.png'],
  };
  assert.deepStrictEqual(applyCaptures(root, root, images), ['b.png']);
  const copied = fs.readFileSync(path.join(root, 'docs/y.png'), 'utf8');
  assert.strictEqual(copied, 'new');
  fs.rmSync(root, { recursive: true });
});
