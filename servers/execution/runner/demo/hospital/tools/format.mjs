// Compact JSON for a terminal: a value that fits in the width stays on
// one line, a longer one gets one line per entry
const WIDTH = 100;

const isObject = (value) => value !== null && typeof value === 'object';

// The entries of an array or an object, each with the prefix of its key
const pairs = (value) =>
  Array.isArray(value)
    ? value.map((entry) => ['', entry])
    : Object.entries(value).map(([key, entry]) => [
        `${JSON.stringify(key)}: `,
        entry,
      ]);

const brackets = (value) => (Array.isArray(value) ? ['[', ']'] : ['{', '}']);

function flat(value) {
  if (!isObject(value)) {
    return JSON.stringify(value);
  }
  const entries = pairs(value).map(([key, entry]) => key + flat(entry));
  const pad = Array.isArray(value) || entries.length === 0 ? '' : ' ';
  const [open, close] = brackets(value);
  return `${open}${pad}${entries.join(', ')}${pad}${close}`;
}

// lead is the width of what comes before the value on its line beyond
// the indent, its key, and the comma after it
export default function format(value, indent = '', lead = 0) {
  const line = flat(value);
  if (!isObject(value) || indent.length + lead + line.length <= WIDTH) {
    return line;
  }
  const inner = `${indent}  `;
  const entries = pairs(value).map(
    ([key, entry]) => inner + key + format(entry, inner, key.length + 1),
  );
  const [open, close] = brackets(value);
  return `${open}\n${entries.join(',\n')}\n${indent}${close}`;
}
