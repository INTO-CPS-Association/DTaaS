import { SDK_MAJOR } from 'src/index';

describe('package entry', () => {
  it('exposes the SDK major version', () => {
    expect(SDK_MAJOR).toBe(1);
  });
});
