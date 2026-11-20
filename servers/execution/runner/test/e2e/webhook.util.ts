import { EventEmitter, once } from 'node:events';
import {
  createServer,
  IncomingHttpHeaders,
  IncomingMessage,
  Server,
} from 'node:http';
import { AddressInfo } from 'node:net';
import { HttpStatus } from '@nestjs/common';
import { unwrap } from './jws.util';

// A post as received, its body unwrapped from a JWS if it is one
export type Post = {
  headers: IncomingHttpHeaders;
  body: Record<string, unknown>;
  raw: string;
};

type Machine = { state: string | null; status: string };

// A webhook that records each post and answers 204
export default class Webhook extends EventEmitter {
  readonly posts: Post[] = [];

  readonly server: Server = createServer((request, response) => {
    void Webhook.read(request).then((raw) => {
      response.writeHead(HttpStatus.NO_CONTENT).end();
      const body = unwrap(raw) as Record<string, unknown>;
      const received = { headers: request.headers, body, raw };
      this.posts.push(received);
      this.emit('post', received);
    });
  });

  private static async read(request: IncomingMessage): Promise<string> {
    const chunks: Buffer[] = [];
    request.on('data', (chunk: Buffer) => chunks.push(chunk));
    await once(request, 'end');
    return Buffer.concat(chunks).toString();
  }

  async listen(): Promise<string> {
    this.server.listen(0, '127.0.0.1');
    await once(this.server, 'listening');
    const { port } = this.server.address() as AddressInfo;
    return `http://127.0.0.1:${port}/dt-events`;
  }

  async close(): Promise<void> {
    this.server.close();
    await once(this.server, 'close');
  }

  // The first state post, received or to come, whose machine passes the
  // check; a presence post has no machine
  received(check: (machine: Machine | null) => boolean): Promise<Post> {
    return this.first(
      ({ body }) =>
        body.kind === 'state' &&
        check((body.data as { machine: Machine | null }).machine),
    );
  }

  // The first presence post, received or to come, online or not
  presence(online: boolean): Promise<Post> {
    return this.first(
      ({ body }) =>
        body.kind === 'presence' &&
        (body.data as { online: boolean }).online === online,
    );
  }

  // The first post, received or to come, that passes the check
  first(passes: (received: Post) => boolean): Promise<Post> {
    const earlier = this.posts.find(passes);
    if (earlier !== undefined) {
      return Promise.resolve(earlier);
    }
    return new Promise((resolve) => {
      const listener = (received: Post) => {
        if (passes(received)) {
          this.off('post', listener);
          resolve(received);
        }
      };
      this.on('post', listener);
    });
  }
}
