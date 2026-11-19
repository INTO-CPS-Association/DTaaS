import {
  CHUNK_BYTES,
  discard,
  isFree,
  readXsrfToken,
  toBase64,
  writePartial,
} from 'extension/contentsUpload';

const URL_PART = 'https://dtaas.example/u/tools/api/contents/m/a.glb.part';

const respond = (status: number) => ({ ok: status < 300, status });

let fetchMock: jest.Mock;

beforeEach(() => {
  fetchMock = jest.fn().mockResolvedValue(respond(201));
  globalThis.fetch = fetchMock;
});

const bodies = () =>
  fetchMock.mock.calls.map(([, init]) => JSON.parse(init.body as string));

describe('the encoding helpers', () => {
  it('reads the XSRF token the server set, decoded', () => {
    document.cookie = '_xsrf=a%20b%2Fc';
    expect(readXsrfToken()).toBe('a b/c');
    document.cookie = '_xsrf=; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    expect(readXsrfToken()).toBeUndefined();
  });

  it('encodes an array larger than one slice without overflowing', () => {
    const bytes = new Uint8Array(0x8000 * 3 + 5).fill(65);

    expect(atob(toBase64(bytes))).toHaveLength(bytes.length);
  });
});

describe('writing the partial file', () => {
  it('sends a file that fits in one request without a chunk number', async () => {
    await writePartial(URL_PART, {}, new Uint8Array([72, 105]));

    expect(bodies()).toEqual([
      { type: 'file', format: 'base64', content: 'SGk=' },
    ]);
  });

  it('sends a large file in ordered pieces, the last one marked', async () => {
    await writePartial(URL_PART, {}, new Uint8Array(CHUNK_BYTES * 2 + 1));

    expect(bodies().map((body) => body.chunk)).toEqual([1, 2, -1]);
  });

  it('tries once more in pieces of half the size after a 413', async () => {
    fetchMock.mockResolvedValueOnce(respond(413));

    await writePartial(URL_PART, {}, new Uint8Array(CHUNK_BYTES + 1));

    // One refused piece, then three pieces of half the size.
    expect(bodies().map((body) => body.chunk)).toEqual([1, 1, 2, -1]);
  });

  it('gives up on any other refusal, and when half size is refused too', async () => {
    fetchMock.mockResolvedValue(respond(500));
    await expect(writePartial(URL_PART, {}, new Uint8Array(1))).rejects.toThrow(
      'HTTP 500',
    );

    fetchMock.mockResolvedValue(respond(413));
    await expect(writePartial(URL_PART, {}, new Uint8Array(1))).rejects.toThrow(
      'HTTP 413',
    );
  });
});

describe('checking and discarding', () => {
  it('takes only a 404 as free, and asks without downloading', async () => {
    fetchMock.mockResolvedValueOnce(respond(404));
    await expect(isFree('u')).resolves.toBe(true);
    expect(fetchMock.mock.calls[0][0]).toBe('u?content=0');

    fetchMock.mockResolvedValueOnce(respond(500));
    await expect(isFree('u')).resolves.toBe(false);
    fetchMock.mockRejectedValueOnce(new Error('offline'));
    await expect(isFree('u')).resolves.toBe(false);
  });

  it('deletes a partial file, and never fails while doing it', async () => {
    fetchMock.mockRejectedValueOnce(new Error('offline'));

    await expect(discard(URL_PART, {})).resolves.toBeUndefined();
    expect(fetchMock.mock.calls[0][1].method).toBe('DELETE');
  });
});
