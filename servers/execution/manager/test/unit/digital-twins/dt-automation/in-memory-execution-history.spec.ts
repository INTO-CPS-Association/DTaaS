import { describe, expect, it } from '@jest/globals';
import { ExecutionStatus } from '@into-cps-association/dt-automation';
import InMemoryExecutionHistory from 'src/digital-twins/dt-automation/in-memory-execution-history.js';

function entry(id: string, dtName: string, timestamp = 1) {
  return {
    id,
    dtName,
    pipelineId: 42,
    timestamp,
    status: ExecutionStatus.RUNNING,
    jobLogs: [],
  };
}

describe('InMemoryExecutionHistory', () => {
  it('starts empty and initialises without effect', async () => {
    const history = new InMemoryExecutionHistory();
    await history.init();

    expect(await history.getAll()).toEqual([]);
    expect(await history.getById('missing')).toBeNull();
  });

  it('stores copies, so later changes to the entry do not leak in', async () => {
    const history = new InMemoryExecutionHistory();
    const added = entry('a', 'hello-world');

    expect(await history.add(added)).toBe('a');
    added.status = ExecutionStatus.FAILED;

    expect((await history.getById('a'))?.status).toBe(ExecutionStatus.RUNNING);
  });

  it('returns copies, so callers cannot change the stored entry', async () => {
    const history = new InMemoryExecutionHistory();
    await history.add(entry('a', 'hello-world'));

    const read = await history.getById('a');
    read!.jobLogs.push({ jobName: 'execute', log: 'tampered' });

    expect((await history.getById('a'))?.jobLogs).toEqual([]);
  });

  it('updates an entry in place', async () => {
    const history = new InMemoryExecutionHistory();
    await history.add(entry('a', 'hello-world'));

    await history.update({
      ...entry('a', 'hello-world'),
      status: ExecutionStatus.COMPLETED,
    });

    expect(await history.getAll()).toHaveLength(1);
    expect((await history.getById('a'))?.status).toBe(
      ExecutionStatus.COMPLETED,
    );
  });

  it('selects and deletes by digital twin name', async () => {
    const history = new InMemoryExecutionHistory();
    await history.add(entry('a', 'hello-world'));
    await history.add(entry('b', 'hello-world', 2));
    await history.add(entry('c', 'other'));

    expect((await history.getByDTName('hello-world')).map((e) => e.id)).toEqual(
      ['a', 'b'],
    );

    await history.deleteByDTName('hello-world');
    expect((await history.getAll()).map((e) => e.id)).toEqual(['c']);

    await history.delete('c');
    expect(await history.getAll()).toEqual([]);
  });
});
