export interface ContentsEntry {
  readonly name: string;
  readonly path: string;
  readonly type: 'file' | 'directory';
  readonly size?: number;
  readonly lastModified?: string;
}

export interface PutOptions {
  /** Refuse to replace an existing file when `false`. Defaults to `true`. */
  readonly overwrite?: boolean;
  readonly mimeType?: string;
}

/** The workspace Jupyter Contents API: credentialed and XSRF-aware. */
export interface ContentsService {
  list(path: string): Promise<ContentsEntry[]>;
  get(path: string): Promise<Uint8Array>;
  put(path: string, bytes: Uint8Array, options?: PutOptions): Promise<void>;
  exists(path: string): Promise<boolean>;
}

export interface FileChange {
  readonly action: 'create' | 'update' | 'delete' | 'move';
  readonly path: string;
  readonly content?: Uint8Array | string;
  readonly previousPath?: string;
}

export interface CommitResult {
  readonly sha: string;
}

export interface MergeRequestResult {
  readonly url: string;
}

/** GitLab access under the signed-in OAuth2 session. */
export interface GitService {
  read(repo: string, path: string, ref?: string): Promise<Uint8Array>;
  commit(
    repo: string,
    branch: string,
    changes: FileChange[],
    message: string,
  ): Promise<CommitResult>;
  openMergeRequest?(
    repo: string,
    source: string,
    target: string,
    title: string,
  ): Promise<MergeRequestResult>;
}
