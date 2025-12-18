import { describe, it, expect } from '@jest/globals';
import { ZodError } from 'zod';
import ZodValidationPipe from 'src/validation.pipe';
import { ExecuteCommandDto, executeCommandSchema } from 'src/dto/command.dto';

describe('Check UpdateCommandDto validation pipe', () => {
  it('Validation successful for correct json request', async () => {
    const updateCommandDto: ExecuteCommandDto = {
      name: 'create',
    };
    const updateCommandValidator: ZodValidationPipe = new ZodValidationPipe(
      executeCommandSchema,
    );

    expect(
      (updateCommandValidator.transform(updateCommandDto) as ExecuteCommandDto)
        .name,
    ).toBe('create');
  });

  it('zod schema validator works correctly', async () => {
    const incorrectRequest = {
      name: 10,
    };
    expect(() => executeCommandSchema.parse(incorrectRequest)).toThrow(
      ZodError,
    );
  });
});
