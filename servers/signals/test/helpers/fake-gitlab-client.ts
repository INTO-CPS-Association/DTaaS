import GitLabClient, { GitLabError } from 'src/auth/gitlab.client';

export type Answer = (resource: string) => unknown;

/**
 * Answers GitLab resources from a list of patterns. A resource no pattern
 * matches is a 404. An answer that is an Error is thrown.
 */
export default class FakeGitLabClient {
  readonly calls: string[] = [];
  readonly tokens: string[] = [];

  // eslint-disable-next-line no-useless-constructor, no-empty-function
  constructor(readonly answers: Array<[RegExp, Answer]>) {}

  isConfigured(): boolean {
    return true;
  }

  async getJson(resource: string, token: string): Promise<unknown> {
    return this.answer(resource, token);
  }

  async getText(resource: string, token: string): Promise<string> {
    const value = await this.answer(resource, token);
    return typeof value === 'string' ? value : JSON.stringify(value);
  }

  async getPages(resource: string, token: string): Promise<unknown[]> {
    return (await this.answer(resource, token)) as unknown[];
  }

  callsTo(pattern: RegExp): number {
    return this.calls.filter((call) => pattern.test(call)).length;
  }

  asClient(): GitLabClient {
    return this as unknown as GitLabClient;
  }

  private async answer(resource: string, token: string): Promise<unknown> {
    this.calls.push(resource);
    this.tokens.push(token);
    const found = this.answers.find(([pattern]) => pattern.test(resource));
    if (found === undefined) throw new GitLabError(404, resource);
    const value = found[1](resource);
    if (value instanceof Error) throw value;
    return value;
  }
}
