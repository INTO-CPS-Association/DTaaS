import { readFileSync } from 'node:fs';
import path from 'node:path';
import { API_MAJOR, API_VERSION, SDK_MAJOR, SDK_VERSION } from 'src/index';

const packageVersion = (): string =>
  JSON.parse(
    readFileSync(path.resolve(__dirname, '../../package.json'), 'utf8'),
  ).version;

describe('package entry', () => {
  it('names the API by the version of the package', () => {
    expect(API_VERSION).toBe(packageVersion());
  });

  it('derives the API major from the API version', () => {
    expect(API_MAJOR).toBe(Number(API_VERSION.split('.')[0]));
  });

  it('keeps the 0.1 names as aliases', () => {
    expect(SDK_VERSION).toBe(API_VERSION);
    expect(SDK_MAJOR).toBe(API_MAJOR);
  });
});
