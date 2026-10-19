import { afterEach, describe, expect, it, jest } from '@jest/globals';
import InfluxClient from 'src/history/influx.client';
import testConfig from 'test/helpers/config';

describe('InfluxClient', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('posts Flux with params to /api/v2/query for the org', async () => {
    const spy = jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(
        new Response('#datatype,double\n,_value\n,2\n', { status: 200 }),
      );
    const client = new InfluxClient(
      testConfig({ 'influx-url': 'http://influx:8086' }),
    );
    const rows = await client.query('alice', 'read-token', {
      query: 'from(bucket: params.bucket)',
      params: { bucket: 'alice' },
    });
    expect(rows).toEqual([{ _value: 2 }]);
    const [url, init] = spy.mock.calls[0] as unknown as [URL, RequestInit];
    expect(url.href).toBe('http://influx:8086/api/v2/query?org=alice');
    expect(init.redirect).toBe('error');
    expect((init.headers as Record<string, string>).Authorization).toBe(
      'Token read-token',
    );
    expect(JSON.parse(String(init.body))).toMatchObject({
      type: 'flux',
      params: { bucket: 'alice' },
    });
  });

  it('fails on an error status', async () => {
    jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response('', { status: 401 }));
    const client = new InfluxClient(
      testConfig({ 'influx-url': 'http://influx:8086/' }),
    );
    await expect(
      client.query('alice', 't', { query: '', params: {} }),
    ).rejects.toThrow('InfluxDB answered 401');
  });
});
