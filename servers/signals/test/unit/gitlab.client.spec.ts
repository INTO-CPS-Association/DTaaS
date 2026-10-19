import { afterEach, describe, expect, it, jest } from '@jest/globals';
import GitLabClient, { GitLabError } from 'src/auth/gitlab.client';
import testConfig from 'test/helpers/config';

type FetchArgs = [URL, RequestInit];

function mockFetch(answers: Array<{ status: number; body: unknown }>) {
  const queue = [...answers];
  return jest.spyOn(globalThis, 'fetch').mockImplementation(async () => {
    const next = queue.shift() ?? { status: 404, body: {} };
    return new Response(JSON.stringify(next.body), { status: next.status });
  });
}

describe('GitLabClient', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  const client = new GitLabClient(
    testConfig({ 'gitlab-url': 'https://gitlab.example.org/gitlab/' }),
  );

  it('sends the token only to gitlab-url, and refuses redirects', async () => {
    const spy = mockFetch([{ status: 200, body: { id: 1 } }]);
    await expect(client.getJson('api/v4/user', 'token-a')).resolves.toEqual({
      id: 1,
    });
    const [url, init] = spy.mock.calls[0] as unknown as FetchArgs;
    expect(url.href).toBe('https://gitlab.example.org/gitlab/api/v4/user');
    expect(init.redirect).toBe('error');
    expect((init.headers as Record<string, string>).Authorization).toBe(
      'Bearer token-a',
    );
  });

  it('turns a failed status into a GitLabError without the token', async () => {
    mockFetch([{ status: 403, body: {} }]);
    const error = await client
      .getText('api/v4/x', 'secret-token')
      .catch((e: unknown) => e);
    expect(error).toBeInstanceOf(GitLabError);
    expect((error as GitLabError).status).toBe(403);
    expect((error as Error).message).not.toContain('secret-token');
  });

  it('reads every page of a list', async () => {
    const fullPage = Array.from({ length: 100 }, (_, i) => ({ id: i }));
    const spy = mockFetch([
      { status: 200, body: fullPage },
      { status: 200, body: [{ id: 100 }] },
    ]);
    const items = await client.getPages(
      'api/v4/groups/DTaaS/projects?simple=true',
      't',
    );
    expect(items).toHaveLength(101);
    const second = (spy.mock.calls[1] as unknown as FetchArgs)[0];
    expect(second.search).toContain('page=2');
  });

  it('refuses a list answer that is not a list', async () => {
    mockFetch([{ status: 200, body: { not: 'a list' } }]);
    await expect(
      client.getPages('api/v4/groups/DTaaS/projects', 't'),
    ).rejects.toBeInstanceOf(GitLabError);
  });

  it('sends nothing when gitlab-url is not set', async () => {
    const spy = mockFetch([]);
    const unconfigured = new GitLabClient(testConfig({ 'gitlab-url': '' }));
    expect(unconfigured.isConfigured()).toBe(false);
    await expect(
      unconfigured.getJson('api/v4/user', 't'),
    ).rejects.toBeInstanceOf(GitLabError);
    expect(spy).not.toHaveBeenCalled();
  });
});
