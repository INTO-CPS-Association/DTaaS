// These tests feed script URLs to the schema to check that it refuses them.
/* eslint-disable no-script-url */
import {
  calibrationSchema,
  substrateDescriptorSchema,
} from 'src/schema/substrate.schema';

const points = [
  [0, 0],
  [1, 0],
  [1, 1],
  [0, 1],
];
const calibration = {
  type: 'homography',
  id: 'h1',
  imagePoints: points,
  worldPoints: points,
};

describe('calibrationSchema', () => {
  it('accepts four point pairs', () => {
    expect(calibrationSchema.safeParse(calibration).success).toBe(true);
  });

  it('rejects fewer than four image points', () => {
    const three = points.slice(0, 3);
    const result = calibrationSchema.safeParse({
      ...calibration,
      imagePoints: three,
      worldPoints: three,
    });
    expect(result.success).toBe(false);
  });

  it('rejects point lists of different lengths', () => {
    const result = calibrationSchema.safeParse({
      ...calibration,
      worldPoints: [...points, [2, 2]],
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].path).toEqual(['worldPoints']);
  });
});

describe('substrateDescriptorSchema', () => {
  it('accepts an embed substrate with time parameters', () => {
    const descriptor = {
      adapter: 'embed',
      source: 'https://grafana.example/d/abc',
      timeParams: ['from', 'to'],
    };
    expect(substrateDescriptorSchema.safeParse(descriptor).success).toBe(true);
  });

  it('rejects a negative latency hint', () => {
    const descriptor = { adapter: 'video', source: 'x', latencyHintMs: -1 };
    expect(substrateDescriptorSchema.safeParse(descriptor).success).toBe(false);
  });

  it('requires an adapter', () => {
    expect(substrateDescriptorSchema.safeParse({ source: 'x' }).success).toBe(
      false,
    );
  });

  it.each([
    'lib://common/a.jpg',
    'git://twins/junction7/junction7.jpg',
    'http://video.example/index.m3u8',
    'https://grafana.example/d/abc',
    'blob:https://dtaas.example/0b6e1c4e',
    'models/a.ifc',
  ])('accepts the source %j', (source) => {
    const descriptor = { adapter: 'image', source };
    expect(substrateDescriptorSchema.safeParse(descriptor).success).toBe(true);
  });

  it.each([
    'javascript:alert(1)',
    ' JAVASCRIPT:alert(1)',
    'java\tscript:alert(1)',
    'data:image/svg+xml,<svg onload=alert(1)>',
    'vbscript:msgbox(1)',
    'file:///etc/passwd',
    'ftp://files.example/a.jpg',
    '//evil.example/a.jpg',
    '../models/a.ifc',
    'lib:../../x',
  ])('refuses the source %j', (source) => {
    const descriptor = { adapter: 'image', source };
    expect(substrateDescriptorSchema.safeParse(descriptor).success).toBe(false);
  });

  describe('options', () => {
    const withOptions = (options: unknown) =>
      substrateDescriptorSchema.safeParse({ adapter: 'soil-profile', options })
        .success;

    it('accepts scalars, lists of scalars and one level of named scalars', () => {
      expect(
        withOptions({
          quantity: 'soil_moisture',
          windowHours: 24,
          live: true,
          floor: null,
          depths: [0.2, 0.4],
          colours: { dry: '#a0522d', wet: '#1e90ff' },
        }),
      ).toBe(true);
    });

    it('refuses a string longer than 2048 characters', () => {
      expect(withOptions({ note: 'a'.repeat(5 * 1024 * 1024) })).toBe(false);
    });

    it('refuses objects nested two levels deep', () => {
      expect(withOptions({ a: { b: { c: 1 } } })).toBe(false);
    });

    it('refuses more than 64 settings', () => {
      const many = Object.fromEntries(
        Array.from({ length: 65 }, (_, i) => [`k${i}`, i]),
      );
      expect(withOptions(many)).toBe(false);
    });
  });
});
