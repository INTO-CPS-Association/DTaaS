export type LogEventType = 'click' | 'change' | 'navigation' | 'notification';

export interface LogEvent {
  readonly sessionId: string;
  readonly userHash: string;
  readonly timestamp: string;
  readonly event: LogEventType;
  readonly page: string;
  readonly element: string;
  readonly label: string;
  readonly context: Record<string, string>;
}

export interface CreateLogEventInput {
  readonly sessionId: string;
  readonly userHash: string;
  readonly event: LogEventType;
  readonly page: string;
  readonly element: string;
  readonly label: string;
  readonly context?: Record<string, string>;
}

export function createLogEvent({
  sessionId,
  userHash,
  event,
  page,
  element,
  label,
  context = {},
}: CreateLogEventInput): LogEvent {
  return {
    sessionId,
    userHash,
    timestamp: new Date().toISOString(),
    event,
    page,
    element,
    label,
    context,
  };
}
