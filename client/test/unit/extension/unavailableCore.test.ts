import unavailableCore from 'extension/unavailableCore';

describe('a client without the visualisation core', () => {
  const { signals, viz } = unavailableCore();

  it('delivers no signal and reports every connection as down', async () => {
    const sink = jest.fn();

    signals.subscribe(['a/b'], 'measured', sink)();

    expect(sink).not.toHaveBeenCalled();
    expect(signals.valueAt('a/b', 'measured')).toBeUndefined();
    expect(await signals.range(['a/b'], 'measured', 0, 1)).toEqual([]);
    expect(signals.connection.get()).toBe('down');
    expect(signals.connection.use(['a/b'])).toBe('down');
    expect(await signals.registry.search('pump')).toEqual([]);
    await expect(signals.registry.get('x')).rejects.toThrow();
  });

  it('keeps a playhead an extension can move', () => {
    signals.playhead.set(42);
    signals.playhead.follow(true);

    expect(signals.playhead.get()).toBe(42);
    expect(signals.playhead.use()).toBe(42);
  });

  it('reads no visualisation and refuses to save one', async () => {
    const dt = { name: 'a', path: 'digital_twins/a', files: [] };

    expect(await viz.load(dt)).toBeNull();
    await expect(viz.save(dt, {} as never)).rejects.toThrow(
      'This client has no visualisation core',
    );
    await expect(viz.substrates.get('image')).rejects.toThrow();
    expect(viz.substrates.list()).toEqual([]);
    expect(viz.anchorKinds).toEqual([]);
    expect(viz.presets).toEqual([]);
  });
});
