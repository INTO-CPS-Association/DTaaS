import { ThrottlerGuard } from '@nestjs/throttler';

type SocketAddressRequest = {
  [key: string]: unknown;
  socket?: {
    remoteAddress?: string;
  };
};

export function getSocketTracker(req: SocketAddressRequest): string {
  return req.socket?.remoteAddress ?? 'unknown';
}

export default class SocketAddressThrottlerGuard extends ThrottlerGuard {
  protected getTracker(req: Record<string, any>): Promise<string> {
    return Promise.resolve(getSocketTracker(req));
  }
}
