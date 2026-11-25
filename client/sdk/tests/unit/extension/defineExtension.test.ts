import defineExtension from 'src/extension/defineExtension';

describe('defineExtension', () => {
  it('returns the extension it was given', () => {
    const extension = {
      id: 'hello',
      name: 'Hello',
      version: '1',
      sdk: 1 as const,
    };
    expect(defineExtension(extension)).toBe(extension);
  });
});
