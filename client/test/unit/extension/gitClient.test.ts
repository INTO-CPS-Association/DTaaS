import createGitService, {
  commitAction,
  type GitApi,
} from 'extension/gitClient';

jest.mock('@gitbeaker/rest', () => ({ Gitlab: jest.fn() }));

function fakeApi() {
  const api = {
    RepositoryFiles: { show: jest.fn() },
    Commits: { create: jest.fn() },
  };
  return { api, git: createGitService((): GitApi => api) };
}

describe('the git service', () => {
  it('reads a file and decodes its base64 content', async () => {
    const { api, git } = fakeApi();
    api.RepositoryFiles.show.mockResolvedValue({ content: 'SGk=' });

    const bytes = await git.read('group/repo', 'dt/a.txt', 'dev');

    expect(api.RepositoryFiles.show).toHaveBeenCalledWith(
      'group/repo',
      'dt/a.txt',
      'dev',
    );
    expect([...bytes]).toEqual([72, 105]);
  });

  it('reads from main when no ref is given', async () => {
    const { api, git } = fakeApi();
    api.RepositoryFiles.show.mockResolvedValue({ content: '' });

    await git.read('repo', 'a.txt');

    expect(api.RepositoryFiles.show).toHaveBeenCalledWith(
      'repo',
      'a.txt',
      'main',
    );
  });

  it('commits every change and returns the commit sha', async () => {
    const { api, git } = fakeApi();
    api.Commits.create.mockResolvedValue({ id: 'abc123' });

    const result = await git.commit(
      'repo',
      'main',
      [{ action: 'create', path: 'a.txt', content: 'text' }],
      'Add a.txt',
    );

    expect(result).toEqual({ sha: 'abc123' });
    expect(api.Commits.create).toHaveBeenCalledWith(
      'repo',
      'main',
      'Add a.txt',
      [{ action: 'create', filePath: 'a.txt', content: 'text' }],
    );
  });
});

describe('commitAction', () => {
  it('sends bytes as base64 and keeps the old path of a move', () => {
    expect(
      commitAction({
        action: 'move',
        path: 'b.bin',
        previousPath: 'a.bin',
        content: new Uint8Array([72, 105]),
      }),
    ).toEqual({
      action: 'move',
      filePath: 'b.bin',
      previousPath: 'a.bin',
      content: 'SGk=',
      encoding: 'base64',
    });
  });

  it('sends a delete with no content', () => {
    expect(commitAction({ action: 'delete', path: 'a.txt' })).toEqual({
      action: 'delete',
      filePath: 'a.txt',
    });
  });
});
