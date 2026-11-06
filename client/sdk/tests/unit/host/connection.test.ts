import { worstConnectionState } from 'src/index';

describe('worstConnectionState', () => {
  it('is live when nothing is waiting', () => {
    expect(worstConnectionState([])).toBe('live');
  });

  it('ranks down above connecting above live', () => {
    expect(worstConnectionState(['live', 'connecting'])).toBe('connecting');
    expect(worstConnectionState(['connecting', 'down', 'live'])).toBe('down');
    expect(worstConnectionState(['live', 'live'])).toBe('live');
  });
});
