import { createWriteStream, existsSync } from 'node:fs';
import { appendFile, mkdir, open, rename, rm, stat } from 'node:fs/promises';
import path from 'node:path';
import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import Config from '../config/config.service.js';
import { LogEventDto } from '../dto/log-event.dto.js';

type LogWriteStream = ReturnType<typeof createWriteStream>;
type StreamErrorHandler = (error: Error) => void;

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

function writeToStream(stream: LogWriteStream, line: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const onError = (error: Error) => {
      stream.off('error', onError);
      reject(error);
    };
    stream.on('error', onError);
    stream.write(line, 'utf8', (error) => {
      stream.off('error', onError);
      if (error !== null && error !== undefined) {
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
  private readonly maxLogBytes: number;
  private readonly retentionFiles: number;
  private writeStream: LogWriteStream | null = null;
  private streamErrorHandler: StreamErrorHandler | null = null;
  private writeQueue: Promise<void> = Promise.resolve();
  private initialized = false;
  private initializePromise: Promise<void> | null = null;
  private currentLogBytes = 0;

  constructor(config: Config) {
    this.logFilePath = config.getLogFilePath();
    this.maxLogBytes = config.getLogMaxBytes();
    this.retentionFiles = config.getLogRetentionFiles();
  }

  async appendEvent(event: LogEventDto): Promise<void> {
    await this.ensureReady();
    const line = `${JSON.stringify(event)}\n`;
    this.writeQueue = this.writeQueue
      .catch(() => undefined)
      .then(() => this.writeLine(line));
    return this.writeQueue;
  }

  async onModuleDestroy(): Promise<void> {
    try {
      await this.writeQueue;
    } finally {
      await this.closeWriteStream();
    }
  }

  private async closeWriteStream(): Promise<void> {
    const stream = this.writeStream;
    if (stream !== null) {
      this.detachStreamErrorHandler(stream);
      await endWriteStream(stream);
      this.writeStream = null;
    }
    this.initialized = false;
    this.currentLogBytes = 0;
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
    this.currentLogBytes = await this.ensureNewlineAtEnd();
    this.writeStream = createWriteStream(this.logFilePath, {
      flags: 'a',
      encoding: 'utf8',
      mode: 0o600,
    });
    this.attachStreamErrorHandler(this.writeStream);
    this.initialized = true;
  }

  private attachStreamErrorHandler(stream: LogWriteStream): void {
    const handler = (error: Error) => this.handleStreamError(error, stream);
    stream.on('error', handler);
    this.streamErrorHandler = handler;
  }

  private detachStreamErrorHandler(stream: LogWriteStream): void {
    if (this.streamErrorHandler === null) return;
    stream.off('error', this.streamErrorHandler);
    this.streamErrorHandler = null;
  }

  private handleStreamError(error: Error, stream: LogWriteStream): void {
    this.logger.error('Workflow log stream failed', error.stack);
    if (this.writeStream !== stream) return;
    this.detachStreamErrorHandler(stream);
    this.writeStream = null;
    this.initialized = false;
    stream.destroy();
  }

  private async ensureNewlineAtEnd(): Promise<number> {
    if (!existsSync(this.logFilePath)) {
      return 0;
    }
    const fileStat = await stat(this.logFilePath);
    if (fileStat.size === 0) {
      return 0;
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
      return fileStat.size + 1;
    }
    return fileStat.size;
  }

  private async writeLine(line: string): Promise<void> {
    const lineBytes = Buffer.byteLength(line, 'utf8');
    await this.rotateIfNeeded(lineBytes);
    if (this.writeStream === null) {
      return Promise.reject(
        new Error('Logger write stream is not initialized'),
      );
    }
    const stream = this.writeStream;
    try {
      await writeToStream(stream, line);
      this.currentLogBytes += lineBytes;
    } catch (error) {
      this.handleStreamError(error as Error, stream);
      throw error;
    }
  }

  private async rotateIfNeeded(incomingBytes: number): Promise<void> {
    if (this.currentLogBytes + incomingBytes <= this.maxLogBytes) return;
    await this.closeWriteStream();
    await this.rotateLogFiles();
    await this.initialize();
  }

  private async rotateLogFiles(): Promise<void> {
    for (let index = this.retentionFiles - 1; index >= 1; index -= 1) {
      const source = `${this.logFilePath}.${index}`;
      const target = `${this.logFilePath}.${index + 1}`;
      await rm(target, { force: true });
      await this.renameIfPresent(source, target);
    }
    await this.renameIfPresent(this.logFilePath, `${this.logFilePath}.1`);
  }

  private async renameIfPresent(source: string, target: string): Promise<void> {
    try {
      await rename(source, target);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    }
  }
}
