import { createWriteStream, existsSync } from 'node:fs';
import { appendFile, mkdir, open, stat } from 'node:fs/promises';
import path from 'node:path';
import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import Config from '../config/config.service.js';
import { LogEventDto } from '../dto/log-event.dto.js';

type LogWriteStream = ReturnType<typeof createWriteStream>;

function endWriteStream(stream: LogWriteStream): Promise<void> {
  return new Promise((resolve, reject) => {
    stream.end((error?: Error | null) => {
      if (error !== undefined && error !== null) {
        reject(error);
        return;
      }
      resolve();
    });
  });
}

function writeToStream(
  stream: LogWriteStream,
  line: string,
  logger: Logger,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const onError = (error: Error) => {
      stream.off('error', onError);
      reject(error);
    };
    stream.on('error', onError);
    stream.write(line, 'utf8', (error) => {
      stream.off('error', onError);
      if (error !== null && error !== undefined) {
        logger.error('Failed to persist workflow log event', error);
        reject(error);
        return;
      }
      resolve();
    });
  });
}

@Injectable()
export default class LogsService implements OnModuleDestroy {
  private readonly logger = new Logger(LogsService.name);
  private readonly logFilePath: string;
  private writeStream: LogWriteStream | null = null;
  private writeQueue: Promise<void> = Promise.resolve();
  private initialized = false;
  private initializePromise: Promise<void> | null = null;

  constructor(config: Config) {
    this.logFilePath = config.getLogFilePath();
  }

  async appendEvent(event: LogEventDto): Promise<void> {
    await this.ensureReady();
    const line = `${JSON.stringify(event)}\n`;
    this.writeQueue = this.writeQueue.then(() => this.writeLine(line));
    return this.writeQueue;
  }

  async onModuleDestroy(): Promise<void> {
    await this.writeQueue;
    await this.closeWriteStream();
  }

  private async closeWriteStream(): Promise<void> {
    const stream = this.writeStream;
    if (stream !== null) {
      await endWriteStream(stream);
      this.writeStream = null;
    }
    this.initialized = false;
  }

  private async ensureReady(): Promise<void> {
    if (this.initialized) {
      return;
    }
    if (this.initializePromise !== null) {
      return this.initializePromise;
    }
    this.initializePromise = this.initialize();
    try {
      await this.initializePromise;
    } finally {
      this.initializePromise = null;
    }
  }

  private async initialize(): Promise<void> {
    await mkdir(path.dirname(this.logFilePath), { recursive: true });
    await this.ensureNewlineAtEnd();
    this.writeStream = createWriteStream(this.logFilePath, {
      flags: 'a',
      encoding: 'utf8',
      mode: 0o600,
    });
    this.initialized = true;
  }

  private async ensureNewlineAtEnd(): Promise<void> {
    if (!existsSync(this.logFilePath)) {
      return;
    }
    const fileStat = await stat(this.logFilePath);
    if (fileStat.size === 0) {
      return;
    }
    // Keep the file as valid JSONL even if an external process wrote a line
    // without a trailing newline.
    const handle = await open(this.logFilePath, 'r');
    const buffer = Buffer.alloc(1);
    try {
      await handle.read(buffer, 0, 1, fileStat.size - 1);
    } finally {
      await handle.close();
    }
    if (buffer[0] !== 0x0a) {
      await appendFile(this.logFilePath, '\n', 'utf8');
    }
  }

  private writeLine(line: string): Promise<void> {
    if (this.writeStream === null) {
      return Promise.reject(
        new Error('Logger write stream is not initialized'),
      );
    }
    return writeToStream(this.writeStream, line, this.logger);
  }
}
