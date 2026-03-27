import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import LogsService from 'src/logs/logs.service';
import Config from 'src/config/config.service';
import { LogEventDto } from 'src/dto/log-event.dto';

describe('LogsService', () => {
  let tempDir = '';

  beforeEach(async () => {
    tempDir = await mkdtemp(path.join(os.tmpdir(), 'dtaas-logger-'));
    process.env.LOGGER_LOG_FILE_PATH = path.join(tempDir, 'workflow.jsonl');
  });

  afterEach(async () => {
    delete process.env.LOGGER_LOG_FILE_PATH;
    await rm(tempDir, { recursive: true, force: true });
  });

  it('appends log events as jsonl', async () => {
    const config = new Config();
    const service = new LogsService(config);
    const event: LogEventDto = {
      sessionId: '4a4f6d5f-818d-4c86-b5dc-0d4f8a38dc02',
      userHash:
        'a3f2b8c1d4e5f67890abcdef1234567890abcdef1234567890abcdef12345678',
      timestamp: '2026-03-24T20:00:00.000Z',
      event: 'click',
      page: '/insights/log',
      element: 'button',
      label: 'Refresh',
      context: {
        source: 'log-viewer',
      },
    };

    await service.appendEvent(event);

    const content = await readFile(config.getLogFilePath(), 'utf8');
    const lines = content.trim().split('\n');
    expect(lines).toHaveLength(1);
    expect(JSON.parse(lines[0]) as LogEventDto).toEqual(event);
  });
});
