import type { FileChange, GitService } from '../host/storage.types';
import toBytes from './bytes';

export interface RecordedCommit {
  readonly repo: string;
  readonly branch: string;
  readonly changes: FileChange[];
  readonly message: string;
  readonly sha: string;
}

export interface RecordedMergeRequest {
  readonly repo: string;
  readonly source: string;
  readonly target: string;
  readonly title: string;
}

export interface GitRecord {
  readonly commits: RecordedCommit[];
  readonly mergeRequests: RecordedMergeRequest[];
}

const DEFAULT_REF = 'main';

const fileKey = (repo: string, ref: string, path: string) =>
  `${repo}@${ref}:${path}`;

const applyChange = (
  files: Map<string, Uint8Array>,
  key: (path: string) => string,
  change: FileChange,
) => {
  const previous = key(change.previousPath ?? change.path);
  const carried = files.get(previous);
  if (change.action === 'delete' || change.action === 'move') {
    files.delete(previous);
  }
  if (change.action !== 'delete') {
    const content = change.content ?? carried ?? '';
    files.set(key(change.path), toBytes(content));
  }
};

/** An in-memory GitLab that records commits and merge requests. */
const createMemoryGit = (recorded: GitRecord): GitService => {
  const files = new Map<string, Uint8Array>();
  return {
    read: async (repo, path, ref = DEFAULT_REF) => {
      const bytes = files.get(fileKey(repo, ref, path));
      if (!bytes) throw new Error(`No such file: ${fileKey(repo, ref, path)}`);
      return bytes;
    },
    commit: async (repo, branch, changes, message) => {
      const key = (path: string) => fileKey(repo, branch, path);
      changes.forEach((change) => applyChange(files, key, change));
      const sha = (recorded.commits.length + 1).toString(16).padStart(40, '0');
      recorded.commits.push({ repo, branch, changes, message, sha });
      return { sha };
    },
    openMergeRequest: async (repo, source, target, title) => {
      recorded.mergeRequests.push({ repo, source, target, title });
      const iid = recorded.mergeRequests.length;
      return { url: `https://gitlab.example/${repo}/-/merge_requests/${iid}` };
    },
  };
};

export default createMemoryGit;
