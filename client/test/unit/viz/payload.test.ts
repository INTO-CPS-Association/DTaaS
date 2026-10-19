import { decodePayload, sampleFrom } from 'viz/payload';

describe('decoding a broker message', () => {
  it('reads JSON with a value, a time and a quality', () => {
    expect(
      decodePayload('{"value": 21.5, "ts": 1700000000000, "quality": "good"}'),
    ).toEqual({ value: 21.5, ts: 1700000000000, quality: 'good' });
    expect(
      decodePayload('{"value": 1, "timestamp": "2026-10-13T10:00:00Z"}')?.ts,
    ).toBe(Date.parse('2026-10-13T10:00:00Z'));
  });

  it('reads a bare number', () => {
    expect(decodePayload(' 21.4 ')).toEqual({ value: 21.4 });
  });

  it('reads the line of the DTaaS examples as a simulated reading', () => {
    const decoded = decodePayload(
      '20261013T10:00:00,temperature,simulation,°C,21.40',
    );

    expect(decoded).toEqual({
      value: 21.4,
      ts: new Date(2026, 9, 13, 10, 0, 0).getTime(),
      channel: 'simulated',
    });
  });

  it('refuses what it cannot read', () => {
    expect(decodePayload('hello')).toBeUndefined();
    expect(decodePayload('{"no": "value"}')).toBeUndefined();
    expect(decodePayload('a,b,c,d,not-a-number')).toBeUndefined();
  });

  it('takes only the value types the SDK allows', () => {
    expect(decodePayload('{"value": "open"}')?.value).toBe('open');
    expect(decodePayload('{"value": false}')?.value).toBe(false);
    expect(decodePayload('{"value": [1, 2.5]}')?.value).toEqual([1, 2.5]);
    expect(decodePayload('{"value": {"a": 1}}')).toBeUndefined();
    expect(decodePayload('{"value": null}')).toBeUndefined();
    expect(decodePayload('{"value": [1, "two"]}')).toBeUndefined();
    expect(decodePayload('[1, 2]')).toBeUndefined();
  });

  it('keeps a known quality and drops any other', () => {
    expect(decodePayload('{"value": 1, "quality": "stale"}')?.quality).toBe(
      'stale',
    );
    expect(decodePayload('{"value": 1, "quality": "excellent"}')).toMatchObject(
      { value: 1, quality: undefined },
    );
  });

  it('stamps a sample with its arrival time when it carries none', () => {
    const sample = sampleFrom('room/temp', '7', 'measured', 1234);

    expect(sample).toMatchObject({
      signalPath: 'room/temp',
      channel: 'measured',
      ts: 1234,
      value: 7,
    });
    expect(sampleFrom('room/temp', 'hello', 'measured', 1)).toBeUndefined();
  });
});
