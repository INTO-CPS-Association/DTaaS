// Prints the reply of curl -w '\n%{http_code}' from stdin: the body as
// compact JSON, then the HTTP status
import { text } from 'node:stream/consumers';
import format from './format.mjs';

const input = await text(process.stdin);
const cut = input.lastIndexOf('\n');
const body = input.slice(0, cut);
const status = input.slice(cut + 1).trim();

let shown = body;
try {
  shown = format(JSON.parse(body));
} catch {
  // not JSON, such as an empty body: print it as it is
}
if (shown !== '') {
  process.stdout.write(`${shown}\n`);
}
process.stdout.write(`\x1b[2mHTTP ${status}\x1b[0m\n`);
