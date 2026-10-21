import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import GitLabClient from '../auth/gitlab.client.js';
import TtlCache from '../auth/ttl-cache.js';
import Config from '../config/config.service.js';
import type {
  AccessPolicy,
  Action,
  Decision,
  Resource,
  SignalTarget,
  Subject,
} from './policy.js';
import TwinReader, { type GroupProject } from './twin-reader.js';

const READ_ACTIONS: ReadonlySet<Action> = new Set(['stream', 'range']);

const projectSchema = z.object({
  id: z.number().int(),
  path: z.string().min(1),
  path_with_namespace: z.string().min(1),
});

type ProjectIndex = { sha: string; targets: SignalTarget[] };

/**
 * A user may read a signal when a twin in a project of the DTaaS group that
 * GitLab lets the user read declares its topic. GitLab answers with the
 * user's own token, so its permissions are the only source of truth.
 */
@Injectable()
export default class GitLabTwinPolicy implements AccessPolicy {
  private readonly projects = new TtlCache<GroupProject[]>();
  // Keyed by project. A new commit on the branch replaces the entry, so the
  // index is rebuilt only when the committed files may have changed.
  private readonly indexes = new Map<number, ProjectIndex>();

  // eslint-disable-next-line no-useless-constructor
  constructor(
    private readonly config: Config,
    private readonly gitlab: GitLabClient,
    private readonly reader: TwinReader,
  ) {} // eslint-disable-line no-empty-function

  async check(
    subject: Subject,
    action: Action,
    resource: Resource,
  ): Promise<Decision> {
    const targets = await this.listResources(subject, action);
    const target = targets.find(
      (candidate) => candidate.path === resource.path,
    );
    return target === undefined
      ? { allowed: false }
      : { allowed: true, target };
  }

  async listResources(
    subject: Subject,
    action: Action,
  ): Promise<SignalTarget[]> {
    if (!READ_ACTIONS.has(action)) return [];
    const projects = await this.projectsOf(subject);
    const lists = await Promise.all(
      projects.map((project) => this.signalsOf(project, subject.token)),
    );
    return lists.flat();
  }

  private async projectsOf(subject: Subject): Promise<GroupProject[]> {
    const key = String(subject.id);
    const cached = this.projects.get(key);
    if (cached !== undefined) return cached;
    const groupPath = this.config.get('gitlab-group');
    const level = this.config.get('gitlab-min-access-level');
    const resource = `api/v4/groups/${encodeURIComponent(groupPath)}/projects?min_access_level=${level}&simple=true`;
    const items = await this.gitlab.getPages(resource, subject.token);
    const projects = items.flatMap((item) => projectOf(item, groupPath));
    this.projects.set(
      key,
      projects,
      Date.now() + this.config.get('projects-cache-ttl'),
    );
    return projects;
  }

  private async signalsOf(
    project: GroupProject,
    token: string,
  ): Promise<SignalTarget[]> {
    const sha = await this.reader.branchSha(project, token);
    if (sha === undefined) return [];
    const cached = this.indexes.get(project.id);
    if (cached?.sha === sha) return cached.targets;
    const targets = await this.reader.signalsAt(project, sha, token);
    this.indexes.set(project.id, { sha, targets });
    return targets;
  }
}

// Only a project directly in the group counts: its path is the owner, which
// names the owner's vhost, org and bucket.
function projectOf(item: unknown, groupPath: string): GroupProject[] {
  const parsed = projectSchema.safeParse(item);
  if (!parsed.success) return [];
  const { id, path, path_with_namespace: fullPath } = parsed.data;
  const expected = `${groupPath}/${path}`.toLowerCase();
  return fullPath.toLowerCase() === expected ? [{ id, owner: path }] : [];
}
