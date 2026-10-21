import createContentsService, {
  assertWorkspacePath,
  workspaceUrl,
} from 'extension/contentsClient';

const BASE = 'https://dtaas.example/user1/tools';

function respond(status: number, body: unknown = {}) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer,
  };
}

describe('the contents service', () => {
  let fetchMock: jest.Mock;
  const contents = createContentsService(async () => BASE);

  beforeEach(() => {
    fetchMock = jest.fn();
    globalThis.fetch = fetchMock;
    document.cookie = '_xsrf=; expires=Thu, 01 Jan 1970 00:00:00 GMT';
  });

  it('encodes each segment of a path in the URL', () => {
    expect(workspaceUrl(BASE, 'files', 'common/[A] b.ifc')).toBe(
      `${BASE}/files/common/%5BA%5D%20b.ifc`,
    );
  });

  it('lists a directory as entries', async () => {
    fetchMock.mockResolvedValue(
      respond(200, {
        content: [
          { name: 'models', path: 'common/models', type: 'directory' },
          { name: 'a.ifc', path: 'common/a.ifc', type: 'file', size: 12 },
        ],
      }),
    );

    const entries = await contents.list('common');

    expect(fetchMock).toHaveBeenCalledWith(`${BASE}/api/contents/common`, {
      credentials: 'include',
    });
    expect(entries.map((entry) => entry.type)).toEqual(['directory', 'file']);
    expect(entries[1].size).toBe(12);
  });

  it('reads the bytes of a file from the file server', async () => {
    fetchMock.mockResolvedValue(respond(200));

    const bytes = await contents.get('common/a.glb');

    expect(fetchMock.mock.calls[0][0]).toBe(`${BASE}/files/common/a.glb`);
    expect([...bytes]).toEqual([1, 2, 3]);
  });

  it('says whether a file exists, and fails on any other answer', async () => {
    fetchMock.mockResolvedValueOnce(respond(404));
    await expect(contents.exists('x')).resolves.toBe(false);
    fetchMock.mockResolvedValueOnce(respond(200));
    await expect(contents.exists('x')).resolves.toBe(true);
    fetchMock.mockResolvedValueOnce(respond(500));
    await expect(contents.exists('x')).rejects.toThrow('HTTP 500');
  });

  it('writes under a temporary name, then renames it, with the XSRF token', async () => {
    document.cookie = '_xsrf=token-1';
    fetchMock
      .mockResolvedValueOnce(respond(201))
      .mockResolvedValueOnce(respond(404))
      .mockResolvedValueOnce(respond(200));

    await contents.put('common/a.txt', new Uint8Array([72, 105]));

    const [[partUrl, write], [checkUrl], [renameUrl, renamed]] =
      fetchMock.mock.calls;
    expect(partUrl).toBe(`${BASE}/api/contents/common/a.txt.part`);
    expect(write.headers['X-XSRFToken']).toBe('token-1');
    expect(JSON.parse(write.body).content).toBe('SGk=');
    expect(checkUrl).toBe(`${BASE}/api/contents/common/a.txt?content=0`);
    expect(renameUrl).toBe(partUrl);
    expect(JSON.parse(renamed.body)).toEqual({ path: 'common/a.txt' });
  });

  it('clears the old file before renaming when it overwrites', async () => {
    fetchMock
      .mockResolvedValueOnce(respond(201))
      .mockResolvedValueOnce(respond(200))
      .mockResolvedValueOnce(respond(204))
      .mockResolvedValueOnce(respond(200));

    await contents.put('a.txt', new Uint8Array([1]));

    expect(fetchMock.mock.calls[2]).toEqual([
      `${BASE}/api/contents/a.txt`,
      expect.objectContaining({ method: 'DELETE' }),
    ]);
  });

  it('does not replace a file when overwrite is false', async () => {
    fetchMock.mockResolvedValue(respond(200));

    await expect(
      contents.put('a.txt', new Uint8Array([1]), { overwrite: false }),
    ).rejects.toThrow('a.txt already exists');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('deletes the partial file and never renames it when a write fails', async () => {
    fetchMock
      .mockResolvedValueOnce(respond(500))
      .mockResolvedValue(respond(204));

    await expect(contents.put('a.txt', new Uint8Array([1]))).rejects.toThrow(
      'HTTP 500',
    );

    const methods = fetchMock.mock.calls.map(([, init]) => init?.method);
    expect(methods).toEqual(['PUT', 'DELETE']);
  });

  it('refuses a path that leaves the workspace before any request', async () => {
    expect(() => assertWorkspacePath('common/../../etc')).toThrow();
    expect(() => assertWorkspacePath('/abs')).toThrow();
    expect(() => assertWorkspacePath('a\\b')).toThrow();
    await expect(contents.get('../secret')).rejects.toThrow('workspace');
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
