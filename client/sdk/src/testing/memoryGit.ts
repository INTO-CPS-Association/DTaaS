import type { FileChange, GitService } from '../host/storage.types';
import toBytes from './bytes';
import settle from './settle';

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

type Files = Map<string, Uint8Array>;

const readFile = (files: Files, repo: string, path: string, ref: string) => {
  const bytes = files.get(fileKey(repo, ref, path));
  if (!bytes) throw new Error(`No such file: ${fileKey(repo, ref, path)}`);
  return bytes;
};

const commitChanges = (
  files: Files,
  recorded: GitRecord,
  commit: Omit<RecordedCommit, 'sha'>,
) => {
  const key = (path: string) => fileKey(commit.repo, commit.branch, path);
  commit.changes.forEach((change) => applyChange(files, key, change));
  const sha = (recorded.commits.length + 1).toString(16).padStart(40, '0');
  recorded.commits.push({ ...commit, sha });
  return { sha };
};

const openMergeRequest = (
  recorded: GitRecord,
  request: RecordedMergeRequest,
) => {
  recorded.mergeRequests.push(request);
  const iid = recorded.mergeRequests.length;
  return {
    url: `https://gitlab.example/${request.repo}/-/merge_requests/${iid}`,
  };
};

/** An in-memory GitLab that records commits and merge requests. */
const createMemoryGit = (recorded: GitRecord): GitService => {
  const files: Files = new Map();
  return {
    read: (repo, path, ref = DEFAULT_REF) =>
      settle(() => readFile(files, repo, path, ref)),
    commit: (repo, branch, changes, message) =>
      settle(() =>
        commitChanges(files, recorded, { repo, branch, changes, message }),
      ),
    openMergeRequest: (repo, source, target, title) =>
      settle(() => openMergeRequest(recorded, { repo, source, target, title })),
  };
};

export default createMemoryGit;
