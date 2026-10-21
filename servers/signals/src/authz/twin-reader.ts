import { Injectable, Logger } from '@nestjs/common';
import { z } from 'zod';
import GitLabClient, { GitLabError } from '../auth/gitlab.client.js';
import Config from '../config/config.service.js';
import fillTemplate from '../config/template.js';
import type { SignalTarget } from './policy.js';
import { signalsOfVisualisation } from './visualisation.js';

/** A project of the DTaaS group: the repository of one user, its owner. */
export type GroupProject = { id: number; owner: string };

const TWINS_FOLDER = 'digital_twins';
const VISUALISATION_FILE = 'visualisation.json';

const branchSchema = z.object({ commit: z.object({ id: z.string().min(1) }) });
const treeEntrySchema = z.object({ name: z.string().min(1), type: z.string() });

function notFoundAs<T>(value: T): (error: unknown) => T {
  return (error: unknown): T => {
    if (error instanceof GitLabError && error.status === 404) return value;
    throw error;
  };
}

/** Reads the committed twins of a project, with the user's own token. */
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
    const twins = await this.twinNames(project, sha, token);
    const lists = await Promise.all(
      twins.map((twin) => this.signalsOfTwin(project, twin, sha, token)),
    );
    return lists.flat();
  }

  private async twinNames(
    project: GroupProject,
    sha: string,
    token: string,
  ): Promise<string[]> {
    const resource = `api/v4/projects/${project.id}/repository/tree?path=${TWINS_FOLDER}&ref=${encodeURIComponent(sha)}`;
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
    project: GroupProject,
    twin: string,
    sha: string,
    token: string,
  ): Promise<SignalTarget[]> {
    const file = encodeURIComponent(
      `${TWINS_FOLDER}/${twin}/${VISUALISATION_FILE}`,
    );
    const resource = `api/v4/projects/${project.id}/repository/files/${file}/raw?ref=${encodeURIComponent(sha)}`;
    const text = await this.gitlab
      .getText(resource, token)
      .catch(notFoundAs(undefined));
    if (text === undefined) return [];
    let raw: unknown;
    try {
      raw = JSON.parse(text);
    } catch {
      this.logger.warn(
        `Skipped ${project.owner}/${twin}: visualisation.json is not JSON`,
      );
      return [];
    }
    return signalsOfVisualisation(raw, this.contextOf(project.owner, twin));
  }

  private contextOf(owner: string, twin: string) {
    return {
      owner,
      twin,
      vhost: fillTemplate(this.config.get('vhost-template'), owner),
      orgTemplate: this.config.get('influx-org-template'),
      bucketTemplate: this.config.get('influx-bucket-template'),
      maxPathLength: this.config.get('max-path-length'),
      warn: (message: string) => this.logger.warn(message),
    };
  }
}
