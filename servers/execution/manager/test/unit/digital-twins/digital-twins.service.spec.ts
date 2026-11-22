import { beforeEach, describe, expect, it } from '@jest/globals';
import DigitalTwinsService from 'src/digital-twins/digital-twins.service.js';
import {
  DigitalTwinNotFoundError,
  ExecutionNotFoundError,
  GitlabFailureError,
} from 'src/digital-twins/digital-twins.errors.js';
import type DtAutomationFacade from 'src/digital-twins/dt-automation/dt-automation-facade.js';
import type { ExecutionRecord } from 'src/digital-twins/interfaces/execution-record.interface.js';
import FakeDtAutomationFacade from '../../support/fake-dt-automation-facade.js';

const gitlabFailure = new GitlabFailureError('GitLab said 401 Unauthorized');

function execution(
  id: string,
  timestamp: number,
  status = 'running',
): ExecutionRecord {
  return {
    id,
    dtName: 'hello-world',
    pipelineId: 42,
    timestamp,
    status,
    jobLogs: [],
  };
}

describe('DigitalTwinsService', () => {
  let facade: FakeDtAutomationFacade;
  let service: DigitalTwinsService;

  beforeEach(() => {
    facade = new FakeDtAutomationFacade();
    service = new DigitalTwinsService(facade as unknown as DtAutomationFacade);
  });

  describe('listing the digital twins', () => {
    it('lists the digital twins of dt-automation', async () => {
      facade.digitalTwins.set('other', 'Another twin');

      expect(await service.listDigitalTwins()).toEqual([
        { name: 'hello-world', description: 'Says hello' },
        { name: 'other', description: 'Another twin' },
      ]);
    });

    it('drops a digital twin that dt-automation no longer lists', async () => {
      facade.digitalTwins.set('other', 'Another twin');
      await service.listDigitalTwins();

      facade.digitalTwins.delete('other');

      expect(await service.listDigitalTwins()).toEqual([
        { name: 'hello-world', description: 'Says hello' },
      ]);
      await expect(service.getDigitalTwin('other')).rejects.toThrow(
        DigitalTwinNotFoundError,
      );
    });

    it('keeps the last list for the other operations while listing fails', async () => {
      const started = await service.startExecution('hello-world');
      facade.listDigitalTwins.mockRejectedValue(gitlabFailure);

      await expect(service.listDigitalTwins()).rejects.toBe(gitlabFailure);
      expect(await service.listExecutions('hello-world')).toEqual([started]);
    });

    it('loads the list once for requests that arrive together', async () => {
      await Promise.all([
        service.listDigitalTwins(),
        service.listDigitalTwins(),
        service.getDigitalTwin('hello-world'),
      ]);

      expect(facade.listDigitalTwins).toHaveBeenCalledTimes(1);
    });
  });

  describe('reading a digital twin', () => {
    it('reads the digital twin from dt-automation', async () => {
      expect(await service.getDigitalTwin('hello-world')).toMatchObject({
        name: 'hello-world',
        fullDescription: '# hello-world',
      });
    });

    it('rejects an unknown digital twin after reloading the list once', async () => {
      await expect(service.getDigitalTwin('nope')).rejects.toThrow(
        DigitalTwinNotFoundError,
      );
      expect(facade.listDigitalTwins).toHaveBeenCalledTimes(1);
      expect(facade.getDigitalTwin).not.toHaveBeenCalled();
    });

    it('passes on a failure of dt-automation', async () => {
      facade.getDigitalTwin.mockRejectedValueOnce(gitlabFailure);

      await expect(service.getDigitalTwin('hello-world')).rejects.toBe(
        gitlabFailure,
      );
    });
  });

  describe('starting an execution', () => {
    it('starts the execution with dt-automation and returns its record', async () => {
      const started = await service.startExecution('hello-world', {
        runnerTag: 'windows',
      });

      expect(started).toMatchObject({
        dtName: 'hello-world',
        status: 'running',
      });
      expect(facade.startExecution).toHaveBeenCalledWith('hello-world', {
        runnerTag: 'windows',
      });
    });

    it('starts with no options when the caller gives none', async () => {
      await service.startExecution('hello-world');

      expect(facade.startExecution).toHaveBeenCalledWith('hello-world', {});
    });

    it('does not start an unknown digital twin', async () => {
      await expect(service.startExecution('nope')).rejects.toThrow(
        DigitalTwinNotFoundError,
      );
      expect(facade.startExecution).not.toHaveBeenCalled();
    });
  });

  describe('stopping an execution', () => {
    it('stops a running execution', async () => {
      const started = await service.startExecution('hello-world');

      const stopped = await service.stopExecution('hello-world', started.id);

      expect(stopped.status).toBe('canceled');
      expect(facade.stopExecution).toHaveBeenCalledWith(
        'hello-world',
        started.id,
      );
    });

    it.each(['completed', 'failed', 'canceled'] as const)(
      'returns an execution that is %s unchanged',
      async (status) => {
        const finished = facade.record(execution('e-1', 1, status));

        expect(await service.stopExecution('hello-world', 'e-1')).toEqual(
          finished,
        );
        expect(facade.stopExecution).not.toHaveBeenCalled();
      },
    );

    it('stops an execution whose status check failed', async () => {
      facade.record(execution('e-1', 1, 'error'));

      const stopped = await service.stopExecution('hello-world', 'e-1');

      expect(stopped.status).toBe('canceled');
    });

    it('rejects an unknown execution without stopping anything', async () => {
      await expect(
        service.stopExecution('hello-world', 'nope'),
      ).rejects.toThrow(ExecutionNotFoundError);
      expect(facade.stopExecution).not.toHaveBeenCalled();
    });
  });

  describe('reading executions', () => {
    it('rejects an execution that belongs to another digital twin', async () => {
      facade.digitalTwins.set('other', 'Another twin');
      const started = await service.startExecution('hello-world');

      await expect(service.getExecution('other', started.id)).rejects.toThrow(
        ExecutionNotFoundError,
      );
    });

    it('lists the executions newest first', async () => {
      facade.record(execution('first', 1000));
      facade.record(execution('second', 2000));

      const executions = await service.listExecutions('hello-world');

      expect(executions.map((record) => record.id)).toEqual([
        'second',
        'first',
      ]);
    });

    it('passes on the execution changes of dt-automation', () => {
      const seen: ExecutionRecord[] = [];
      service.executionChanges().subscribe((record) => seen.push(record));

      facade.changes.next(execution('e-1', 1));

      expect(seen).toEqual([execution('e-1', 1)]);
    });
  });
});
