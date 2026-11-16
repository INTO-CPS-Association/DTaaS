import { mkdtempSync, rmSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from '@jest/globals';
import Queue from 'src/queue.service';

const switches = (entries: [string, boolean][]) => new Map(entries);

describe('Queue peer switches', () => {
  let dir: string;
  let file: string;
  let queue: Queue;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'runner-'));
    file = join(dir, 'runner.db');
    queue = new Queue();
  });

  afterEach(() => {
    queue.close();
    rmSync(dir, { recursive: true, force: true });
  });

  it('Should have no switches before the first change', () => {
    expect(queue.peerSwitches()).toEqual(new Map());
  });

  it('Should return the latest switch of each peer, also within a second', () => {
    queue.setPeers(switches([['hospital-2', false]]));
    queue.setPeers(switches([['hospital-3', false]]));
    queue.setPeers(switches([['hospital-2', true]]));

    expect(queue.peerSwitches()).toEqual(
      switches([
        ['hospital-2', true],
        ['hospital-3', false],
      ]),
    );
  });

  it('Should keep the switches in the database file', () => {
    queue.open(file);
    queue.setPeers(switches([['hospital-2', false]]));
    queue.close();

    const reopened = new Queue();
    reopened.open(file);

    expect(reopened.peerSwitches()).toEqual(switches([['hospital-2', false]]));
    reopened.close();
  });

  it('Should store the switches of one request together or not at all', () => {
    queue.open(file);
    // a trigger makes the second insert of the request fail
    const other = new DatabaseSync(file);
    other.exec(
      'CREATE TRIGGER refuse BEFORE INSERT ON peers ' +
        "WHEN NEW.id = 'hospital-3' BEGIN SELECT RAISE(ABORT, 'refused'); END",
    );
    other.close();

    expect(() =>
      queue.setPeers(
        switches([
          ['hospital-2', false],
          ['hospital-3', false],
        ]),
      ),
    ).toThrow(/refused/);
    expect(queue.peerSwitches()).toEqual(new Map());
  });
});
