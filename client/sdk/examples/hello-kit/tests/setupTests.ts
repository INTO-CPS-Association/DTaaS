// jsdom lacks TextEncoder and TextDecoder, which react-router needs.
import { TextEncoder, TextDecoder } from 'node:util';

Object.defineProperty(globalThis, 'TextEncoder', {
  value: TextEncoder,
  writable: true,
});

Object.defineProperty(globalThis, 'TextDecoder', {
  value: TextDecoder,
  writable: true,
});
