export type DigitalTwinErrorCode =
  'digital-twin-not-found' | 'execution-not-found' | 'gitlab-failure';

export class DigitalTwinError extends Error {
  constructor(
    readonly code: DigitalTwinErrorCode,
    message: string,
    options?: { cause?: unknown },
  ) {
    super(message, options);
    this.name = 'DigitalTwinError';
  }
}

export class DigitalTwinNotFoundError extends DigitalTwinError {
  constructor(dtName: string) {
    super('digital-twin-not-found', `Digital twin ${dtName} not found`);
    this.name = 'DigitalTwinNotFoundError';
  }
}

export class ExecutionNotFoundError extends DigitalTwinError {
  constructor(dtName: string, executionId: string) {
    super(
      'execution-not-found',
      `Execution ${executionId} of ${dtName} not found`,
    );
    this.name = 'ExecutionNotFoundError';
  }
}

export class GitlabFailureError extends DigitalTwinError {
  constructor(message: string, options?: { cause?: unknown }) {
    super('gitlab-failure', message, options);
    this.name = 'GitlabFailureError';
  }
}
