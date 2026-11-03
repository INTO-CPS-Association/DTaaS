import { EventEmitter } from 'node:events';
import type { Response } from 'express';

/** Enough of an Express response to hold server-sent events in memory. */
export default class FakeResponse extends EventEmitter {
  readonly chunks: string[] = [];
  readonly headers: Record<string, string> = {};
  statusCode = 0;
  writableEnded = false;
  writableLength = 0;

  status(code: number): this {
    this.statusCode = code;
    return this;
  }

  setHeader(name: string, value: string): void {
    this.headers[name] = value;
  }

  flushHeaders(): void {
    // Nothing is buffered in memory.
  }

  write(chunk: string): boolean {
    this.chunks.push(chunk);
    return true;
  }

  end(): void {
    this.writableEnded = true;
  }

  get text(): string {
    return this.chunks.join('');
  }

  asResponse(): Response {
    return this as unknown as Response;
  }
}
