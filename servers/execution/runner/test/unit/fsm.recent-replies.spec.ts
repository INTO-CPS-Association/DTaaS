import { describe, expect, it, jest } from '@jest/globals';
import RecentReplies from 'src/fsm/recent-replies';

describe('Recent replies', () => {
  it('Should keep the request and reply of a key', () => {
    const replies = new RecentReplies<string>();
    replies.add('key-1', 'event stop', 'accepted');

    expect(replies.get('key-1')).toEqual({
      request: 'event stop',
      reply: 'accepted',
    });
    expect(replies.get('key-2')).toBeUndefined();
  });

  it('Should keep nothing for an empty or missing key', () => {
    const replies = new RecentReplies<string>();
    replies.add('', 'event stop', 'accepted');
    replies.add(undefined, 'event stop', 'accepted');

    expect(replies.get('')).toBeUndefined();
    expect(replies.get(undefined)).toBeUndefined();
  });

  it('Should forget the oldest key beyond its limit', () => {
    const replies = new RecentReplies<string>(2);
    replies.add('key-1', 'a', 'one');
    replies.add('key-2', 'b', 'two');
    replies.add('key-3', 'c', 'three');

    expect(replies.get('key-1')).toBeUndefined();
    expect(replies.get('key-2')?.reply).toBe('two');
    expect(replies.get('key-3')?.reply).toBe('three');
  });

  describe('resolve', () => {
    const handlers = (reply: string) => ({
      compute: jest.fn(() => reply),
      mismatch: jest.fn(() => 'mismatch'),
      keep: (value: string) => value !== 'refused',
    });

    it('Should compute and keep a new reply', () => {
      const replies = new RecentReplies<string>();

      expect(replies.resolve('key-1', 'a', handlers('one'))).toBe('one');
      expect(replies.get('key-1')?.reply).toBe('one');
    });

    it('Should replay the reply to a repeated request', () => {
      const replies = new RecentReplies<string>();
      replies.resolve('key-1', 'a', handlers('one'));
      const again = handlers('two');

      expect(replies.resolve('key-1', 'a', again)).toBe('one');
      expect(again.compute).not.toHaveBeenCalled();
    });

    it('Should answer a key of another request with the mismatch reply', () => {
      const replies = new RecentReplies<string>();
      replies.resolve('key-1', 'a', handlers('one'));

      expect(replies.resolve('key-1', 'b', handlers('two'))).toBe('mismatch');
    });

    it('Should not keep a reply that keep refuses', () => {
      const replies = new RecentReplies<string>();

      expect(replies.resolve('key-1', 'a', handlers('refused'))).toBe(
        'refused',
      );
      expect(replies.get('key-1')).toBeUndefined();
    });
  });
});
