export interface LogEvent {
  readonly sessionId: string;
  readonly userHash: string;
  readonly timestamp: string;
  readonly event: string;
  readonly page: string;
  readonly element: string;
  readonly label: string;
  readonly context: Record<string, string>;
}

export function createLogEvent(
  sessionId: string,
  userHash: string,
  page: string,
  element: string,
  label: string,
  context: Record<string, string> = {},
): LogEvent {
  return {
    sessionId,
    userHash,
    timestamp: new Date().toISOString(),
    event: 'click',
    page,
    element,
    label,
    context,
  };
}
