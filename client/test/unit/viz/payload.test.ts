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
