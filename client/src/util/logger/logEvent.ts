export type LogEventType =
  | 'click'
  | 'change'
  | 'navigation'
  | 'notification'
  | 'dismiss';

export type LogContextValue =
  | string
  | number
  | boolean
  | null
  | LogContextValue[]
  | LogContext;

export interface LogContext {
  [key: string]: LogContextValue;
}

export interface PageTransition {
  readonly src: string;
  readonly target: string;
}

export interface LogEvent {
  /** IndexedDB auto-increment key, present on events read back from the store. */
  readonly id?: number;
  readonly sessionId: string;
  readonly userHash: string;
  readonly timestamp: string;
  readonly event: LogEventType;
  readonly page: string;
  readonly page_transition?: PageTransition;
  readonly element: string;
  readonly label: string;
  readonly context: LogContext;
}

export interface CreateLogEventInput {
  readonly sessionId: string;
  readonly userHash: string;
  readonly event: LogEventType;
  readonly page: string;
  readonly pageTransition?: PageTransition;
  readonly element: string;
  readonly label: string;
  readonly context?: LogContext;
}

export function createLogEvent({
  sessionId,
  userHash,
  event,
  page,
  pageTransition,
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
    ...(pageTransition ? { page_transition: pageTransition } : {}),
    element,
    label,
    context,
  };
}
