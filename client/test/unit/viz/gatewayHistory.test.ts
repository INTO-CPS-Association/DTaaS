import createGatewayHistory from 'viz/gatewayHistory';

const TOKEN = 'glpat-secret-token';

function answer(body: unknown, status = 200) {
  return {
    ok: status === 200,
    status,
    json: async () => body,
  } as Response;
}

function history(response: Response) {
  const fetch = jest.fn(async () => response);
  return {
    fetch,
    history: createGatewayHistory({
      url: 'https://signals.example',
      token: () => TOKEN,
      fetch,
    }),
  };
}

describe('the signals gateway history', () => {
  it('asks for a range with the token in the header only', async () => {
    const { fetch, history: gateway } = history(answer({ samples: [] }));

    await gateway.range(['a', 'b'], 'measured', 10, 20);

    const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://signals.example/range');
    expect(JSON.parse(init.body as string)).toEqual({
      paths: ['a', 'b'],
      channel: 'measured',
      from: 10,
      to: 20,
    });
    expect(init.headers).toMatchObject({ Authorization: `Bearer ${TOKEN}` });
    expect(url).not.toContain(TOKEN);
  });

  it('keeps the samples it can read, on the channel asked for', async () => {
    const samples = [
      { path: 'a', channel: 'measured', ts: 10, value: 1, quality: 'good' },
      { path: 'a', ts: 11, value: { not: 'a value' } },
      { path: 'a', ts: 'late', value: 2 },
      { path: 'b', ts: 12, value: 'on', quality: 'unknown' },
      null,
    ];
    const { history: gateway } = history(answer({ samples, truncated: true }));

    const range = await gateway.range(['a', 'b'], 'measured', 0, 20);

    expect(range).toEqual([
      {
        twinId: '',
        signalPath: 'a',
        channel: 'measured',
        ts: 10,
        value: 1,
        quality: 'good',
      },
      {
        twinId: '',
        signalPath: 'b',
        channel: 'measured',
        ts: 12,
        value: 'on',
        quality: undefined,
      },
    ]);
  });

  it('reads an answer without samples as none', async () => {
    const { history: gateway } = history(answer({ status: 'odd' }));

    await expect(gateway.range(['a'], 'measured', 0, 1)).resolves.toEqual([]);
  });

  it('rejects when the gateway refuses the range', async () => {
    const { history: gateway } = history(answer({}, 403));

    await expect(gateway.range(['a'], 'measured', 0, 1)).rejects.toThrow('403');
  });
});
