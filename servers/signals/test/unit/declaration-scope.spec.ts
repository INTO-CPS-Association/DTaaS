import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals';
import { Logger } from '@nestjs/common';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import AccessService from 'src/authz/access.service';
import GitLabTwinPolicy from 'src/authz/gitlab-twin.policy';
import TwinReader from 'src/authz/twin-reader';
import ownersOf from 'test/helpers/owners';
import testConfig from 'test/helpers/config';
import FakeGitLabClient from 'test/helpers/fake-gitlab-client';
import { visualisationOf } from 'test/helpers/twins';

// Carol is not the owner: GitLab lets her read Alice's project, as a member.
const CAROL = { id: '9', username: 'carol', token: 'token-c' };
const ALICE_PROJECT = {
  id: 10,
  path: 'alice',
  path_with_namespace: 'DTaaS/alice',
};
const TWIN_FILE = /files\/digital_twins%2F([^%]+)%2Fvisualisation\.json\/raw/;

// Alice's project, holding one folder per twin with its visualisation.json.
function projectWith(twins: Record<string, unknown>): FakeGitLabClient {
  return new FakeGitLabClient([
    [/groups\/DTaaS\/projects/, () => [ALICE_PROJECT]],
    [/repository\/branches\/master$/, () => ({ commit: { id: 's1' } })],
    [
      /repository\/tree/,
      () => Object.keys(twins).map((name) => ({ name, type: 'tree' })),
    ],
    [TWIN_FILE, (resource) => twins[resource.match(TWIN_FILE)?.[1] ?? '']],
  ]);
}

function policyOf(gitlab: FakeGitLabClient) {
  const config = testConfig();
  return new GitLabTwinPolicy(
    config,
    gitlab.asClient(),
    new TwinReader(config, gitlab.asClient()),
    ownersOf(),
  );
}

beforeEach(() => {
  jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
  jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('The scope of a grant', () => {
  it('grants a whole GitLab project and not one twin: a reader of the project gets the signals of both its twins', async () => {
    const gitlab = projectWith({
      pump: visualisationOf(['alice/pump/flow']),
      boiler: visualisationOf(['alice/boiler/temperature']),
    });
    const access = new AccessService(policyOf(gitlab));
    const decision = await access.decide(CAROL, 'stream', [
      'alice/pump/flow',
      'alice/boiler/temperature',
    ]);
    expect(decision.refused).toEqual([]);
    expect(decision.allowed.map(({ twin, owner }) => [twin, owner])).toEqual([
      ['pump', 'alice'],
      ['boiler', 'alice'],
    ]);
  });
});

describe("A declaration that names another owner's namespace", () => {
  it("refuses a topic outside the prefixes of the project's owner, whatever the URL names", async () => {
    const forged = {
      schemaVersion: '1.0',
      transports: [
        {
          adapter: 'mqtt',
          url: 'mqtt://broker:1883/bob',
          topics: ['bob/x', 'alice/y'],
        },
      ],
    };
    const policy = policyOf(projectWith({ pump: forged }));
    const targets = await policy.listResources(CAROL, 'stream');
    expect(targets).toEqual([
      expect.objectContaining({
        path: 'alice/y',
        owner: 'alice',
        twin: 'pump',
      }),
    ]);
  });
});

describe('A Keycloak or Dex sign-in', () => {
  const DAVE = {
    id: 'https://keycloak.example/realms/dtaas#d-1',
    username: 'dave',
    token: 'jwt-of-dave',
    owners: ['alice', 'nobody'],
  };
  let tokenDir = '';

  beforeEach(async () => {
    tokenDir = await mkdtemp(path.join(os.tmpdir(), 'signals-token-'));
  });

  afterEach(async () => {
    await rm(tokenDir, { recursive: true, force: true });
  });

  function claimsPolicy(gitlab: FakeGitLabClient, tokenFile: string) {
    const config = testConfig({ 'gitlab-token-file': tokenFile });
    return new GitLabTwinPolicy(
      config,
      gitlab.asClient(),
      new TwinReader(config, gitlab.asClient()),
      ownersOf(),
    );
  }

  function groupWithAlice(): FakeGitLabClient {
    return new FakeGitLabClient([
      [/^api\/v4\/projects\/DTaaS%2Falice$/, () => ALICE_PROJECT],
      [/repository\/branches\/master$/, () => ({ commit: { id: 's1' } })],
      [/repository\/tree/, () => [{ name: 'pump', type: 'tree' }]],
      [TWIN_FILE, () => visualisationOf(['alice/pump/flow'])],
    ]);
  }

  it("reads the twins of the owners its groups name with the gateway's token, never the user's", async () => {
    const tokenFile = path.join(tokenDir, 'gitlab_dtaas_signals_token');
    await writeFile(tokenFile, 'service-token\n', { mode: 0o600 });
    const gitlab = groupWithAlice();
    const access = new AccessService(claimsPolicy(gitlab, tokenFile));
    const decision = await access.decide(DAVE, 'range', [
      'alice/pump/flow',
      'bob/x',
    ]);
    expect(decision.allowed.map(({ path: p }) => p)).toEqual([
      'alice/pump/flow',
    ]);
    expect(decision.refused).toEqual(['bob/x']);
    expect(new Set(gitlab.tokens)).toEqual(new Set(['service-token']));
  });

  it('refuses every path when the token file is missing', async () => {
    const access = new AccessService(claimsPolicy(groupWithAlice(), ''));
    const decision = await access.decide(DAVE, 'stream', ['alice/pump/flow']);
    expect(decision.allowed).toEqual([]);
  });
});
