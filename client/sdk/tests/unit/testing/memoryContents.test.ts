import createMemoryContents from 'src/testing/memoryContents';

const bytes = (text: string) => new TextEncoder().encode(text);
const text = (data: Uint8Array) => new TextDecoder().decode(data);

describe('createMemoryContents', () => {
  it('stores and returns file bytes', async () => {
    const contents = createMemoryContents();
    await contents.put('common/models/a.glb', bytes('glb'));
    expect(text(await contents.get('/common/models/a.glb'))).toBe('glb');
  });

  it('accepts initial files as text', async () => {
    const contents = createMemoryContents({ 'a.txt': 'hi' });
    expect(text(await contents.get('a.txt'))).toBe('hi');
  });

  it('reports whether a file exists', async () => {
    const contents = createMemoryContents({ 'a.txt': 'hi' });
    await expect(contents.exists('a.txt')).resolves.toBe(true);
    await expect(contents.exists('b.txt')).resolves.toBe(false);
  });

  it('rejects reading a missing file', async () => {
    await expect(createMemoryContents().get('nope')).rejects.toThrow(
      'No such file: nope',
    );
  });

  it('refuses to overwrite when asked not to', async () => {
    const contents = createMemoryContents({ 'a.txt': 'hi' });
    await expect(
      contents.put('a.txt', bytes('x'), { overwrite: false }),
    ).rejects.toThrow('File exists: a.txt');
  });

  it('lists files and sub-directories of a directory', async () => {
    const contents = createMemoryContents({
      'common/models/a.glb': 'a',
      'common/models/deep/b.glb': 'bb',
      'common/c.txt': 'c',
    });
    expect(await contents.list('common/models/')).toEqual([
      { name: 'a.glb', path: 'common/models/a.glb', type: 'file', size: 1 },
      { name: 'deep', path: 'common/models/deep', type: 'directory' },
    ]);
  });

  it('lists the root directory', async () => {
    const contents = createMemoryContents({ 'a.txt': 'a', 'dir/b.txt': 'b' });
    expect((await contents.list('')).map((e) => e.name)).toEqual([
      'a.txt',
      'dir',
    ]);
  });
});
