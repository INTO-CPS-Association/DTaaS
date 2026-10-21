import type { Response } from 'express';

// A client that reads slower than signals arrive would make the server
// buffer without bound. Past this backlog, new samples are dropped.
const MAX_BACKLOG_BYTES = 1024 * 1024;

/** Server-sent events on one HTTP response. */
export default class SseWriter {
  // eslint-disable-next-line no-useless-constructor, no-empty-function
  constructor(private readonly response: Response) {}

  open(retryMs: number): void {
    this.response.status(200);
    this.response.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    this.response.setHeader('Cache-Control', 'no-cache, no-transform');
    this.response.setHeader('Connection', 'keep-alive');
    // Tells a buffering proxy such as nginx to pass each event on at once.
    this.response.setHeader('X-Accel-Buffering', 'no');
    this.response.flushHeaders();
    this.write(`retry: ${retryMs}\n\n`);
  }

  /** JSON never holds a raw newline, so the data fits on one 'data:' line. */
  event(name: string, data: unknown): void {
    this.write(`event: ${name}\ndata: ${JSON.stringify(data)}\n\n`);
  }

  comment(text: string): void {
    this.write(`: ${text}\n\n`);
  }

  isCongested(): boolean {
    return this.response.writableLength > MAX_BACKLOG_BYTES;
  }

  end(): void {
    if (!this.response.writableEnded) this.response.end();
  }

  private write(chunk: string): void {
    if (!this.response.writableEnded) this.response.write(chunk);
  }
}
