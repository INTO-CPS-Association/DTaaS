import SseWriter from 'src/stream/sse-writer';
import StreamSession, {
  type Backfill,
  type Recheck,
} from 'src/stream/stream-session';
import type FakeBroker from 'test/helpers/fake-broker';
import FakeResponse from 'test/helpers/fake-response';
import { FLOW } from 'test/helpers/twins';

const OPTIONS = {
  retryMs: 5000,
  keepAliveMs: 15_000,
  lifetimeMs: 600_000,
  maxMessageBytes: 128,
  recheckMs: 60_000,
};
export const MAX_BACKLOG = 1024 * 1024;

/** A stream session on one signal, writing to a fake response. */
export default function sessionWith(
  broker: FakeBroker,
  response = new FakeResponse(),
  recheck?: Recheck,
  backfill?: Backfill,
) {
  const session = new StreamSession(
    new SseWriter(response.asResponse(), MAX_BACKLOG),
    broker,
    { targets: [FLOW], options: OPTIONS, recheck, backfill },
  );
  return { session, response };
}
