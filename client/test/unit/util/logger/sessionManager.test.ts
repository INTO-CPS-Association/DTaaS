import { v4 as uuidv4 } from 'uuid';
import { getSessionId, resetSessionId } from 'util/logger/sessionManager';

let callCount = 0;

describe('sessionManager', () => {
  beforeEach(() => {
    sessionStorage.clear();
    callCount += 1;
    (uuidv4 as jest.Mock).mockReturnValue(`mock-uuid-${callCount}`);
  });

  it('generates a new session ID on first call', () => {
    const id = getSessionId();
    expect(id).toBeDefined();
    expect(id.length).toBeGreaterThan(0);
  });

  it('returns the same session ID on subsequent calls', () => {
    const id1 = getSessionId();
    const id2 = getSessionId();
    expect(id1).toBe(id2);
  });

  it('persists session ID in sessionStorage', () => {
    const id = getSessionId();
    const stored = sessionStorage.getItem('dtaas_logger_session_id');
    expect(stored).toBe(id);
  });

  it('resets the session ID', () => {
    (uuidv4 as jest.Mock)
      .mockReturnValueOnce('uuid-first')
      .mockReturnValueOnce('uuid-second');
    const id1 = getSessionId();
    const id2 = resetSessionId();
    expect(id2).not.toBe(id1);
    expect(getSessionId()).toBe(id2);
  });
});
