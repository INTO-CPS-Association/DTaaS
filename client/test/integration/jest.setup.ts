import '@testing-library/jest-dom';
import 'test/__mocks__/integration/module_mocks';
import 'test/__mocks__/global_mocks';

// Polyfills for Node.js test environment
import { TextEncoder, TextDecoder } from 'node:util';

globalThis.TextEncoder = TextEncoder;
globalThis.TextDecoder = TextDecoder as typeof globalThis.TextDecoder;

beforeEach(() => {
  jest.resetAllMocks();
});
