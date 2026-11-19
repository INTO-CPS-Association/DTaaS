import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals';
import { ForbiddenException, Logger } from '@nestjs/common';
import type { AuthenticatedRequest } from 'src/auth/auth.guard';
import AccessService from 'src/authz/access.service';
import GitLabTwinPolicy from 'src/authz/gitlab-twin.policy';
import TwinReader from 'src/authz/twin-reader';
import type { ConfigValues } from 'src/config/schema';
import SignalsController from 'src/signals.controller';
import DeliveryStats from 'src/stream/delivery-stats';
import StreamService from 'src/stream/stream.service';
import StreamSlots from 'src/stream/stream-slots';
import testConfig from 'test/helpers/config';
import CommandService from 'src/command/command.service';
import HistoryService from 'src/history/history.service';
import ownersOf from 'test/helpers/owners';
import FakeBroker, { reading } from 'test/helpers/fake-broker';
import FakePostgres from 'test/helpers/fake-postgres';
import FakeGitLabClient from 'test/helpers/fake-gitlab-client';
import FakeResponse from 'test/helpers/fake-response';
import { PUMP } from 'test/helpers/twins';

const FLOW = 'alice/pump/flow';
const PROJECT = { id: 10, path: 'alice', path_with_namespace: 'DTaaS/alice' };
// How long GitLab takes to list the projects. A real answer is never
// instant, and that delay moves the cache expiry past the next recheck.
const GITLAB_LATENCY = 500;
const STEP = 100;
const REQUEST = {
  headers: {},
  signalsUser: {
    identity: { id: '7', username: 'alice', email: 'alice@example.org' },
    token: 'token-a',
  },
} as unknown as AuthenticatedRequest;
const RANGE = { paths: [FLOW], channel: 'measured', from: 0, to: 1000 };

type Membership = { projects: unknown[] };

function gitlabFor(membership: Membership): FakeGitLabClient {
  return new FakeGitLabClient([
    [
      /groups\/DTaaS\/projects/,
      () => {
        const answer = membership.projects;
        return new Promise((resolve) =>
          setTimeout(() => resolve(answer), GITLAB_LATENCY),
        );
      },
    ],
    [/repository\/branches\/master$/, () => ({ commit: { id: 's1' } })],
    [/repository\/tree/, () => [{ name: 'pump', type: 'tree' }]],
    [/files\/digital_twins%2Fpump%2Fvisualisation/, () => PUMP],
  ]);
}

// The controller with every real part between the request and GitLab, so a
// test exercises the same recheck the gateway runs.
function gatewayWith(overrides: Partial<ConfigValues> = {}) {
  const config = testConfig(overrides);
  const membership: Membership = { projects: [PROJECT] };
  const gitlab = gitlabFor(membership).asClient();
  const policy = new GitLabTwinPolicy(
    config,
    gitlab,
    new TwinReader(config, gitlab),
    ownersOf(),
  );
  const broker = new FakeBroker();
  const stats = new DeliveryStats();
  const controller = new SignalsController(
    config,
    new AccessService(policy),
    new StreamService(config, broker, stats),
    new StreamSlots(config),
    stats,
    new HistoryService(config, new FakePostgres(() => []).asClient()),
    new CommandService(config, broker),
  );
  return { controller, broker, membership };
}

// Publishes a sample every step and answers when the last one was forwarded.
async function lastDelivery(
  broker: FakeBroker,
  response: FakeResponse,
  limit: number,
): Promise<number> {
  let delivered = Date.now();
  while (!response.writableEnded && Date.now() < limit) {
    const before = response.chunks.length;
    broker.deliver('alice/pump/flow', reading(1));
    if (response.chunks.length > before) delivered = Date.now();
    await jest.advanceTimersByTimeAsync(STEP);
  }
  return delivered;
}

describe('Revoked access', () => {
  beforeEach(() => {
    jest.useFakeTimers({ now: 0 });
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('stops delivery within stream-recheck-interval plus projects-cache-ttl, 120 s with the defaults', async () => {
    const recheck = 60_000;
    const projectsTtl = 60_000;
    const { controller, broker, membership } = gatewayWith();
    const response = new FakeResponse();
    const running = controller.stream(
      { paths: [FLOW] },
      REQUEST,
      response.asResponse(),
    );
    await jest.advanceTimersByTimeAsync(GITLAB_LATENCY);
    // The first recheck finds the project list expired and asks GitLab again.
    // The user is removed right after GitLab answered, which is the worst case:
    // the next recheck is still served the cached membership.
    await jest.advanceTimersByTimeAsync(recheck + GITLAB_LATENCY);
    membership.projects = [];
    const revokedAt = Date.now();
    const delivered = await lastDelivery(broker, response, revokedAt + 300_000);
    await running;
    expect(delivered - revokedAt).toBeGreaterThan(recheck);
    expect(delivered - revokedAt).toBeLessThan(recheck + projectsTtl);
    expect(response.text).toContain(
      `event: refused\ndata: {"paths":["${FLOW}"]}`,
    );
    expect(broker.bindings).toHaveLength(0);
  });

  it('stops delivery at the next recheck when projects-cache-ttl is shorter than the interval', async () => {
    const recheck = 60_000;
    const { controller, broker, membership } = gatewayWith({
      'projects-cache-ttl': 1000,
    });
    const response = new FakeResponse();
    const running = controller.stream(
      { paths: [FLOW] },
      REQUEST,
      response.asResponse(),
    );
    await jest.advanceTimersByTimeAsync(GITLAB_LATENCY);
    membership.projects = [];
    const revokedAt = Date.now();
    const delivered = await lastDelivery(broker, response, revokedAt + 300_000);
    await running;
    expect(delivered - revokedAt).toBeLessThan(recheck + GITLAB_LATENCY);
    expect(response.writableEnded).toBe(true);
  });

  it('refuses a reconnect and a range request with 403 once the cached membership expires, as the live recheck does', async () => {
    const { controller, broker, membership } = gatewayWith();
    const range = () => controller.range(RANGE, REQUEST);
    const opened = range();
    await jest.advanceTimersByTimeAsync(GITLAB_LATENCY);
    await expect(opened).resolves.toEqual({ samples: [], truncated: false });
    membership.projects = [];
    // Within projects-cache-ttl both still read the cached membership.
    await expect(range()).resolves.toBeDefined();
    await jest.advanceTimersByTimeAsync(60_000);
    const reconnect = controller.stream(
      { paths: [FLOW] },
      REQUEST,
      new FakeResponse().asResponse(),
    );
    const refused = Promise.all([
      expect(reconnect).rejects.toBeInstanceOf(ForbiddenException),
      expect(range()).rejects.toBeInstanceOf(ForbiddenException),
    ]);
    await jest.advanceTimersByTimeAsync(GITLAB_LATENCY);
    await refused;
    expect(broker.bindings).toHaveLength(0);
  });
});
