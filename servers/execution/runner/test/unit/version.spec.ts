import { readFileSync } from 'node:fs';
import { describe, expect, it } from '@jest/globals';
import { PACKAGE_VERSION } from 'src/config/commander';

describe('Check package version', () => {
  it('Should match the version in package.json', () => {
    const { version } = JSON.parse(readFileSync('package.json', 'utf8'));
    expect(PACKAGE_VERSION).toEqual(version);
  });
});
