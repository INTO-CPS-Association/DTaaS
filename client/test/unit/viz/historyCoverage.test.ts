import createHistoryCoverage from 'viz/historyCoverage';

describe('the coverage of the store', () => {
  it('has the whole stretch as a gap before anything is read', () => {
    expect(createHistoryCoverage().gaps('a', 0, 10)).toEqual([[0, 10]]);
  });

  it('leaves out what was read, merging stretches that touch', () => {
    const coverage = createHistoryCoverage();
    coverage.add('a', 0, 10);
    coverage.add('a', 10, 20);
    coverage.add('a', 30, 40);

    expect(coverage.gaps('a', 0, 50)).toEqual([
      [20, 30],
      [40, 50],
    ]);
    expect(coverage.gaps('a', 5, 15)).toEqual([]);
    expect(coverage.gaps('b', 5, 15)).toEqual([[5, 15]]);
  });

  it('covers a live stretch until its subscription ends', () => {
    const coverage = createHistoryCoverage();
    coverage.add('a', 100, Infinity);

    expect(coverage.gaps('a', 50, 500)).toEqual([[50, 100]]);
    coverage.close('a', 200);
    expect(coverage.gaps('a', 50, 500)).toEqual([
      [50, 100],
      [200, 500],
    ]);
  });
});
