import { Injectable, Logger } from '@nestjs/common';
import { z } from 'zod';
import GitLabClient, { notFoundAs } from '../auth/gitlab.client.js';
import Config from '../config/config.service.js';
import type { SignalTarget } from './policy.js';
import { signalsOfVisualisation } from './visualisation.js';

/** A project of the DTaaS group: the repository of one user, its owner. */
export type GroupProject = { id: number; owner: string };

// One commit of a project, read with one token.
type ProjectCommit = { project: GroupProject; sha: string; token: string };

const VISUALISATION_FILE = 'visualisation.json';

const branchSchema = z.object({ commit: z.object({ id: z.string().min(1) }) });
const treeEntrySchema = z.object({ name: z.string().min(1), type: z.string() });

/**
 * Reads the committed twins of a project, with the user's own token for a
 * GitLab sign-in and the gateway's token for a Keycloak or Dex sign-in.
 */
@Injectable()
export default class TwinReader {
  private readonly logger = new Logger(TwinReader.name);

  // eslint-disable-next-line no-useless-constructor
  constructor(
    private readonly config: Config,
    private readonly gitlab: GitLabClient,
  ) {} // eslint-disable-line no-empty-function

  /** The commit the configured branch points at, or undefined without one. */
  async branchSha(
    project: GroupProject,
    token: string,
  ): Promise<string | undefined> {
    const branch = encodeURIComponent(this.config.get('gitlab-branch'));
    const resource = `api/v4/projects/${project.id}/repository/branches/${branch}`;
    const body = await this.gitlab
      .getJson(resource, token)
      .catch(notFoundAs(undefined));
    return body === undefined ? undefined : branchSchema.parse(body).commit.id;
  }

  /** Every signal the twins of a project declare at one commit. */
  async signalsAt(
    project: GroupProject,
    sha: string,
    token: string,
  ): Promise<SignalTarget[]> {
    const commit = { project, sha, token };
    const twins = await this.twinNames(commit);
    const lists = await Promise.all(
      twins.map((twin) => this.signalsOfTwin(commit, twin)),
    );
    return lists.flat();
  }

  private async twinNames({
    project,
    sha,
    token,
  }: ProjectCommit): Promise<string[]> {
    const folder = encodeURIComponent(this.config.get('twins-folder'));
    const resource = `api/v4/projects/${project.id}/repository/tree?path=${folder}&ref=${encodeURIComponent(sha)}`;
    const entries = await this.gitlab
      .getPages(resource, token)
      .catch(notFoundAs([]));
    return entries.flatMap((entry) => {
      const parsed = treeEntrySchema.safeParse(entry);
      return parsed.success && parsed.data.type === 'tree'
        ? [parsed.data.name]
        : [];
    });
  }

  private async signalsOfTwin(
    { project, sha, token }: ProjectCommit,
    twin: string,
  ): Promise<SignalTarget[]> {
    const file = encodeURIComponent(
      `${this.config.get('twins-folder')}/${twin}/${VISUALISATION_FILE}`,
    );
    const resource = `api/v4/projects/${project.id}/repository/files/${file}/raw?ref=${encodeURIComponent(sha)}`;
    const text = await this.gitlab
      .getText(resource, token)
      .catch(notFoundAs(undefined));
    if (text === undefined) return [];
    const raw = this.parseJson(text, `${project.owner}/${twin}`);
    if (raw === undefined) return [];
    return signalsOfVisualisation(raw, this.contextOf(project.owner, twin));
  }

  // A file that is not JSON declares nothing, and the twin is skipped.
  private parseJson(text: string, name: string): unknown {
    try {
      return JSON.parse(text) as unknown;
    } catch {
      this.logger.warn(`Skipped ${name}: visualisation.json is not JSON`);
      return undefined;
    }
  }

  private contextOf(owner: string, twin: string) {
    return {
      owner,
      twin,
      maxPathLength: this.config.get('max-path-length'),
      defaultChannel: this.config.get('default-channel'),
      warn: (message: string) => this.logger.warn(message),
      log: (message: string) => this.logger.log(message),
    };
  }
}
