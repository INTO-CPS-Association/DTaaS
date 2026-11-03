import {
  createServer,
  type IncomingMessage,
  type Server,
  type ServerResponse,
} from 'node:http';
import type { AddressInfo } from 'node:net';

export type StubUser = {
  id: number;
  username: string;
  email: string;
  projects: number[];
};

export type StubProject = {
  id: number;
  owner: string;
  sha: string;
  twins: Record<string, unknown>;
};

type Route = {
  pattern: RegExp;
  answer: (match: RegExpMatchArray, user: StubUser) => unknown;
};

function send(res: ServerResponse, status: number, body: unknown): void {
  const text = typeof body === 'string' ? body : JSON.stringify(body);
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(text);
}

/**
 * GitLab in one process: the token, user, group and repository endpoints the
 * gateway calls. A token not in `users` gets 401, as on a real GitLab.
 */
export default class StubGitLab {
  readonly requests: string[] = [];
  private server?: Server;
  private readonly routes: Route[];

  constructor(
    readonly users: Record<string, StubUser>,
    readonly projects: StubProject[],
  ) {
    this.routes = [...this.identityRoutes(), ...this.repositoryRoutes()];
  }

  private identityRoutes(): Route[] {
    return [
      {
        pattern: /^\/oauth\/token\/info$/,
        answer: (_m, u) => ({
          resource_owner_id: u.id,
          expires_in_seconds: 3600,
        }),
      },
      {
        pattern: /^\/api\/v4\/user$/,
        answer: (_m, u) => ({ id: u.id, username: u.username, email: u.email }),
      },
      {
        pattern: /^\/api\/v4\/groups\/DTaaS\/projects\?/,
        answer: (_m, u) => this.projectsOf(u),
      },
    ];
  }

  private repositoryRoutes(): Route[] {
    return [
      {
        pattern: /^\/api\/v4\/projects\/(\d+)\/repository\/branches\/master$/,
        answer: (m, u) =>
          this.withProject(m, u, (p) => ({ commit: { id: p.sha } })),
      },
      {
        pattern: /^\/api\/v4\/projects\/(\d+)\/repository\/tree\?/,
        answer: (m, u) =>
          this.withProject(m, u, (p) =>
            Object.keys(p.twins).map((name) => ({ name, type: 'tree' })),
          ),
      },
      {
        pattern:
          /^\/api\/v4\/projects\/(\d+)\/repository\/files\/digital_twins%2F([^%]+)%2Fvisualisation\.json\/raw\?/,
        answer: (m, u) => this.withProject(m, u, (p) => p.twins[m[2]]),
      },
    ];
  }

  async start(): Promise<string> {
    this.server = createServer((req, res) => this.handle(req, res));
    await new Promise<void>((resolve) =>
      this.server?.listen(0, '127.0.0.1', resolve),
    );
    const { port } = this.server.address() as AddressInfo;
    return `http://127.0.0.1:${port}`;
  }

  async stop(): Promise<void> {
    await new Promise((resolve) => this.server?.close(resolve));
  }

  private handle(req: IncomingMessage, res: ServerResponse): void {
    const url = req.url ?? '';
    this.requests.push(url);
    const token = (req.headers.authorization ?? '').replace(/^Bearer /, '');
    const user = this.users[token];
    if (user === undefined)
      return send(res, 401, { message: '401 Unauthorized' });
    for (const route of this.routes) {
      const match = url.match(route.pattern);
      if (match === null) continue;
      const body = route.answer(match, user);
      return body === undefined
        ? send(res, 404, { message: '404 Not Found' })
        : send(res, 200, body);
    }
    return send(res, 404, { message: '404 Not Found' });
  }

  private projectsOf(user: StubUser) {
    return this.projects
      .filter((p) => user.projects.includes(p.id))
      .map((p) => ({
        id: p.id,
        path: p.owner,
        path_with_namespace: `DTaaS/${p.owner}`,
      }));
  }

  private withProject(
    match: RegExpMatchArray,
    user: StubUser,
    read: (p: StubProject) => unknown,
  ) {
    const project = this.projects.find((p) => p.id === Number(match[1]));
    if (project === undefined || !user.projects.includes(project.id))
      return undefined;
    const body = read(project);
    // GitLab serves a raw file as text, not as JSON.
    return match[0].includes('/raw?') && body !== undefined
      ? JSON.stringify(body)
      : body;
  }
}
