import { describe, it, expect } from '@jest/globals';
import { ZodError } from 'zod';
import ZodValidationPipe from 'src/validation.pipe';
import { LogEventDto, logEventSchema } from 'src/dto/log-event.dto';

describe('Log event validation pipe', () => {
  it('validates a correct log payload', () => {
    const payload: LogEventDto = {
      sessionId: '4a4f6d5f-818d-4c86-b5dc-0d4f8a38dc02',
      userHash:
        'a3f2b8c1d4e5f67890abcdef1234567890abcdef1234567890abcdef12345678',
      timestamp: '2026-03-24T20:00:00.000Z',
      event: 'click',
      page: '/library',
      element: 'tab',
      label: 'Functions',
      context: {
        tab: 'functions',
      },
    };

    const validator = new ZodValidationPipe(logEventSchema);
    expect((validator.transform(payload) as LogEventDto).page).toBe('/library');
  });

  it('schema rejects invalid payload', () => {
    const invalidPayload = {
      sessionId: 'not-a-uuid',
      userHash: 'x',
      timestamp: 'not-time',
      event: 'click',
      page: '/library',
      element: 'tab',
      label: 'Functions',
      context: {},
    };

    expect(() => logEventSchema.parse(invalidPayload)).toThrow(ZodError);
  });
});
