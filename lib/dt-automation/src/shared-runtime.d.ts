// The package compiles without the DOM and Node.js types.
// Declare here only globals that both browsers and Node.js provide.

declare function setTimeout(callback: () => void, delay?: number): unknown;
declare function clearTimeout(handle: unknown): void;

declare function atob(data: string): string;

interface Crypto {
  getRandomValues<T extends ArrayBufferView>(array: T): T;
}
declare var crypto: Crypto;

interface TextDecoder {
  decode(input?: Uint8Array): string;
}
declare var TextDecoder: {
  prototype: TextDecoder;
  new (): TextDecoder;
};

interface Headers {
  get(name: string): string | null;
}

interface Response {
  readonly headers: Headers;
  readonly status: number;
}
