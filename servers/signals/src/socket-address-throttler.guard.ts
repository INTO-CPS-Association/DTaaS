import { ThrottlerGuard } from '@nestjs/throttler';

type ClientRequest = {
  [key: string]: unknown;
  ip?: string;
  socket?: {
    remoteAddress?: string;
  };
};

// Express sets req.ip from X-Forwarded-For only when the request came from a
// proxy named in trusted-proxies, taking the address that proxy saw. With no
// trusted proxy it is the socket address, so a forged header changes nothing.
export function getClientTracker(req: ClientRequest): string {
  return req.ip ?? req.socket?.remoteAddress ?? 'unknown';
}

export default class SocketAddressThrottlerGuard extends ThrottlerGuard {
  protected getTracker(req: Record<string, any>): Promise<string> {
    return Promise.resolve(getClientTracker(req));
  }
}
