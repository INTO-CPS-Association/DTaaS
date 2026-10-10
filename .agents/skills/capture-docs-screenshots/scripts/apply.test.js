const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { applyCaptures } = require('./apply');
const { IMAGES } = require('./images');

const REPO_ROOT = path.resolve(__dirname, '../../../..');
const TARGETS = Object.values(IMAGES).flat();

test('every target sits in an existing docs directory', () => {
  for (const target of TARGETS) {
    assert.ok(target.startsWith('docs/'), target);
    const dir = path.join(REPO_ROOT, path.dirname(target));
    assert.ok(fs.existsSync(dir), target);
  }
});

test('no documentation image has two sources', () => {
  assert.strictEqual(new Set(TARGETS).size, TARGETS.length);
});

test('every target is referenced from the markdown near it', () => {
  for (const target of TARGETS) {
    const pagesDir = path.join(REPO_ROOT, path.dirname(target), '..');
    const markdown = fs
      .readdirSync(pagesDir, { recursive: true })
      .filter((file) => file.endsWith('.md'))
      .map((file) => fs.readFileSync(path.join(pagesDir, file), 'utf8'))
      .join('\n');
    assert.ok(markdown.includes(path.basename(target)), target);
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
