import { describe, expect, it } from '@jest/globals';
import { missingCapabilities } from 'src/scripts/capabilities';

// The text of /proc/self/status with the effective and ambient sets
const status = (effective: string, ambient?: string) =>
  [
    'Name:\tnode',
    'CapInh:\t00000000000000e0',
    'CapPrm:\t00000000000000e0',
    `CapEff:\t${effective}`,
    'CapBnd:\t000001ffffffffff',
    ...(ambient === undefined ? [] : [`CapAmb:\t${ambient}`]),
    'NoNewPrivs:\t0',
  ].join('\n');

const ALL = ['CAP_SETUID', 'CAP_SETGID', 'CAP_KILL'];

describe('Capabilities of the runner', () => {
  it.each([
    ['e0 in both sets', '00000000000000e0', '00000000000000e0'],
    ['more than the three', '000001ffffffffff', '00000000000000ff'],
  ])('Should find none missing for %s', (_, effective, ambient) => {
    expect(missingCapabilities(status(effective, ambient))).toEqual([]);
  });

  it('Should name CAP_KILL for c0', () => {
    const text = status('00000000000000c0', '00000000000000c0');

    expect(missingCapabilities(text)).toEqual(['CAP_KILL']);
  });

  it('Should name what the ambient set lacks', () => {
    const text = status('00000000000000e0', '0000000000000060');

    expect(missingCapabilities(text)).toEqual(['CAP_SETUID']);
  });

  it.each([
    ['without a CapAmb line', '00000000000000e0', undefined],
    ['for file capabilities alone', '00000000000000e0', '0000000000000000'],
    ['for an unprivileged runner', '0000000000000000', '0000000000000000'],
  ])('Should name all three %s', (_, effective, ambient) => {
    expect(missingCapabilities(status(effective, ambient))).toEqual(ALL);
  });
});
