import '@testing-library/jest-dom';
import 'test/__mocks__/global_mocks';
import 'test/__mocks__/unit/page_mocks';
import 'test/__mocks__/unit/component_mocks';
import 'test/__mocks__/unit/module_mocks';

// Polyfills for Node.js test environment
import { TextEncoder, TextDecoder } from 'node:util';

globalThis.TextEncoder = TextEncoder;
globalThis.TextDecoder = TextDecoder as typeof globalThis.TextDecoder;

beforeEach(() => {
  jest.resetAllMocks();
});
