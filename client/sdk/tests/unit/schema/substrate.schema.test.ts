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
    '../models/a.ifc',
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
  ])('refuses the source %j', (source) => {
    const descriptor = { adapter: 'image', source };
    expect(substrateDescriptorSchema.safeParse(descriptor).success).toBe(false);
  });
});
