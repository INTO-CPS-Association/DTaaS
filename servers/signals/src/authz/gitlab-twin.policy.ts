import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import GitLabClient, { notFoundAs } from '../auth/gitlab.client.js';
import TtlCache from '../auth/ttl-cache.js';
import Config from '../config/config.service.js';
import readSecretFile from '../config/secrets.js';
import type {
  AccessPolicy,
  Action,
  Decision,
  Resource,
  SignalTarget,
  Subject,
} from './policy.js';
import Owners, { ownsTopic } from './owners.js';
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
 * the user may read declares its topic. For a GitLab sign-in, GitLab answers
 * with the user's own token, so its permissions are the only source of
 * truth. For a Keycloak or Dex sign-in, the groups of the token name the
 * projects, and the twins are read with the gateway's own GitLab token.
 */
@Injectable()
export default class GitLabTwinPolicy implements AccessPolicy {
  private readonly projects = new TtlCache<GroupProject[]>();
  // Keyed by project. A new commit on the branch replaces the entry, so the
  // index is rebuilt only when the committed files may have changed. Entries
  // expire, and the cache is bounded, so projects no one reads any more do
  // not stay in memory.
  private readonly indexes = new TtlCache<ProjectIndex>();

  // eslint-disable-next-line no-useless-constructor
  constructor(
    private readonly config: Config,
    private readonly gitlab: GitLabClient,
    private readonly reader: TwinReader,
    private readonly owners: Owners,
  ) {} // eslint-disable-line no-empty-function

  async check(
    subject: Subject,
    action: Action,
    resource: Resource,
  ): Promise<Decision> {
    const targets = await this.listResources(subject, action);
    const target = targets.find(
      (candidate) =>
        candidate.path === resource.path && candidate.owner === resource.owner,
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
    if (subject.owners === undefined) {
      const projects = await this.projectsOf(subject);
      return this.signalsOfAll(projects, subject.token);
    }
    const token = await readSecretFile(
      this.config.get('gitlab-token-file'),
      'gitlab-token-file',
    );
    const projects = await this.projectsOfOwners(subject.owners, token);
    return this.signalsOfAll(projects, token);
  }

  private async signalsOfAll(
    projects: GroupProject[],
    token: string,
  ): Promise<SignalTarget[]> {
    const [lists, groups] = await Promise.all([
      Promise.all(projects.map((project) => this.signalsOf(project, token))),
      this.owners.groups(),
    ]);
    // A declared topic outside its owner's prefixes belongs to another group.
    return lists.flat().flatMap((target) => {
      const group = groups.get(target.owner);
      return group !== undefined && ownsTopic(group, target.path)
        ? [{ ...target, group: group.group }]
        : [];
    });
  }

  // The project of each owner named by the groups of a token. An owner
  // without a project in the DTaaS group reads nothing.
  private async projectsOfOwners(
    owners: string[],
    token: string,
  ): Promise<GroupProject[]> {
    const groupPath = this.config.get('gitlab-group');
    const lists = await Promise.all(
      owners.map(async (owner) => {
        const id = encodeURIComponent(`${groupPath}/${owner}`);
        const item = await this.gitlab
          .getJson(`api/v4/projects/${id}`, token)
          .catch(notFoundAs(undefined));
        return projectOf(item, groupPath);
      }),
    );
    return lists.flat();
  }

  private async projectsOf(subject: Subject): Promise<GroupProject[]> {
    const key = subject.id;
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
    const key = String(project.id);
    const cached = this.indexes.get(key);
    if (cached?.sha === sha) return cached.targets;
    const targets = await this.reader.signalsAt(project, sha, token);
    const expiresAt = Date.now() + this.config.get('twin-index-cache-ttl');
    this.indexes.set(key, { sha, targets }, expiresAt);
    return targets;
  }
}

// Only a project directly in the group counts: its path is the owner of the
// twins it holds.
function projectOf(item: unknown, groupPath: string): GroupProject[] {
  const parsed = projectSchema.safeParse(item);
  if (!parsed.success) return [];
  const { id, path, path_with_namespace: fullPath } = parsed.data;
  const expected = `${groupPath}/${path}`.toLowerCase();
  return fullPath.toLowerCase() === expected ? [{ id, owner: path }] : [];
}
