import createMemoryGit, { type GitRecord } from 'src/testing/memoryGit';

const text = (data: Uint8Array) => new TextDecoder().decode(data);

const setup = () => {
  const recorded: GitRecord = { commits: [], mergeRequests: [] };
  return { git: createMemoryGit(recorded), recorded };
};

describe('createMemoryGit', () => {
  it('reads back committed files on the branch', async () => {
    const { git } = setup();
    await git.commit(
      'dt/j7',
      'main',
      [{ action: 'create', path: 'v.json', content: '{}' }],
      'add',
    );
    expect(text(await git.read('dt/j7', 'v.json'))).toBe('{}');
  });

  it('records each commit with an incrementing sha', async () => {
    const { git, recorded } = setup();
    const first = await git.commit('r', 'main', [], 'one');
    const second = await git.commit('r', 'main', [], 'two');
    expect(first.sha).not.toBe(second.sha);
    expect(recorded.commits.map((c) => c.message)).toEqual(['one', 'two']);
  });

  it('keeps branches apart', async () => {
    const { git } = setup();
    await git.commit(
      'r',
      'feature',
      [{ action: 'create', path: 'a', content: 'x' }],
      'm',
    );
    await expect(git.read('r', 'a')).rejects.toThrow('No such file: r@main:a');
    expect(text(await git.read('r', 'a', 'feature'))).toBe('x');
  });

  it('applies delete and move changes', async () => {
    const { git } = setup();
    await git.commit(
      'r',
      'main',
      [
        { action: 'create', path: 'a', content: new Uint8Array([1]) },
        { action: 'create', path: 'b', content: 'b' },
      ],
      'm',
    );
    await git.commit(
      'r',
      'main',
      [
        { action: 'delete', path: 'b' },
        { action: 'move', path: 'c', previousPath: 'a' },
      ],
      'm',
    );
    await expect(git.read('r', 'b')).rejects.toThrow();
    await expect(git.read('r', 'a')).rejects.toThrow();
    expect(Array.from(await git.read('r', 'c'))).toEqual([1]);
  });

  it('records merge requests', async () => {
    const { git, recorded } = setup();
    const mr = await git.openMergeRequest?.(
      'r',
      'feature',
      'main',
      'Raise threshold',
    );
    expect(mr?.url).toBe('https://gitlab.example/r/-/merge_requests/1');
    expect(recorded.mergeRequests).toEqual([
      {
        repo: 'r',
        source: 'feature',
        target: 'main',
        title: 'Raise threshold',
      },
    ]);
  });
});
