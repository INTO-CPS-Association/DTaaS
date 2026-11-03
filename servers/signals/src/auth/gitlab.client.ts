import { Injectable } from '@nestjs/common';
import Config from '../config/config.service.js';

export class GitLabError extends Error {
  constructor(
    readonly status: number,
    resource: string,
  ) {
    super(`GitLab answered ${status} for ${resource}`);
  }
}

const PAGE_SIZE = 100;
const MAX_PAGES = 20;

/**
 * Calls to the one configured GitLab, with the user's own token.
 *
 * The token is only ever sent to gitlab-url. Redirects are refused, so a
 * GitLab behind a misconfigured proxy cannot forward the token elsewhere.
 * Error messages name the path and the status, never a header.
 */
@Injectable()
export default class GitLabClient {
  // eslint-disable-next-line no-useless-constructor, no-empty-function
  constructor(private readonly config: Config) {}

  isConfigured(): boolean {
    return this.config.get('gitlab-url') !== '';
  }

  async getJson(resource: string, token: string): Promise<unknown> {
    const response = await this.request(resource, token);
    return response.json();
  }

  async getText(resource: string, token: string): Promise<string> {
    const response = await this.request(resource, token);
    return response.text();
  }

  /** Every page of a list endpoint, up to a bound that stops a runaway loop. */
  async getPages(resource: string, token: string): Promise<unknown[]> {
    const items: unknown[] = [];
    const separator = resource.includes('?') ? '&' : '?';
    for (let page = 1; page <= MAX_PAGES; page += 1) {
      const pageResource = `${resource}${separator}per_page=${PAGE_SIZE}&page=${page}`;
      const batch = await this.getJson(pageResource, token);
      if (!Array.isArray(batch)) throw new GitLabError(200, resource);
      items.push(...batch);
      if (batch.length < PAGE_SIZE) break;
    }
    return items;
  }

  // Every resource is a path the gateway builds under gitlab-url, so the
  // request never leaves the configured host.
  private urlOf(resource: string): URL {
    let base = this.config.get('gitlab-url');
    while (base.endsWith('/')) base = base.slice(0, -1);
    return new URL(`${base}/${resource}`);
  }

  private async request(resource: string, token: string): Promise<Response> {
    if (!this.isConfigured()) throw new GitLabError(0, resource);
    const response = await fetch(this.urlOf(resource), {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      redirect: 'error',
      signal: AbortSignal.timeout(this.config.get('gitlab-timeout')),
    });
    if (!response.ok) throw new GitLabError(response.status, resource);
    return response;
  }
}
