import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import LogsService from 'src/logs/logs.service';
import Config from 'src/config/config.service';
import { LogEventDto } from 'src/dto/log-event.dto';

const baseEvent: LogEventDto = {
  sessionId: '4a4f6d5f-818d-4c86-b5dc-0d4f8a38dc02',
  userHash: 'a3f2b8c1d4e5f67890abcdef1234567890abcdef1234567890abcdef12345678',
  timestamp: '2026-03-24T20:00:00.000Z',
  event: 'click',
  page: '/insights/log',
  element: 'button',
  label: 'Refresh',
  context: {
    source: 'log-viewer',
  },
};

const originalEnv = { ...process.env };

describe('LogsService', () => {
  let tempDir = '';
  let logFilePath = '';

  beforeEach(async () => {
    tempDir = await mkdtemp(path.join(os.tmpdir(), 'dtaas-logger-'));
    logFilePath = path.join(tempDir, 'workflow.jsonl');
    process.env = { ...originalEnv };
    process.env.LOGGER_LOG_FILE_PATH = logFilePath;
  });

  afterEach(async () => {
    process.env = { ...originalEnv };
    await rm(tempDir, { recursive: true, force: true });
  });

  it('appends log events as jsonl', async () => {
    const config = new Config();
    const service = new LogsService(config);

    await service.appendEvent(baseEvent);
    await service.onModuleDestroy();

    const content = await readFile(config.getLogFilePath(), 'utf8');
    const lines = content.trim().split('\n');
    expect(lines).toHaveLength(1);
    expect(JSON.parse(lines[0]) as LogEventDto).toEqual(baseEvent);
  });

  it('repairs missing newline before append', async () => {
    await writeFile(logFilePath, JSON.stringify(baseEvent), 'utf8');
    const config = new Config();
    const service = new LogsService(config);
    const nextEvent = { ...baseEvent, label: 'Next action' };

    await service.appendEvent(nextEvent);
    await service.onModuleDestroy();

    const content = await readFile(logFilePath, 'utf8');
    const lines = content.trim().split('\n');
    expect(lines).toHaveLength(2);
    expect(JSON.parse(lines[0]) as LogEventDto).toEqual(baseEvent);
    expect(JSON.parse(lines[1]) as LogEventDto).toEqual(nextEvent);
  });
});
