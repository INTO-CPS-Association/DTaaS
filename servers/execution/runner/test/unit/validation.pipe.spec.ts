import { describe, it, expect } from '@jest/globals';
import { ZodError } from 'zod';
import ZodValidationPipe from 'src/validation.pipe';
import { ExecuteCommandDto, updateCommandSchema } from 'src/dto/command.dto';

describe('Check UpdatePhaseDto validation pipe', () => {
  it('Validation successful for correct json request', async () => {
    const updateCommandDto: ExecuteCommandDto = {
      name: 'create',
    };
    const updateCommandValidator: ZodValidationPipe = new ZodValidationPipe(
      updateCommandSchema,
    );

    expect(updateCommandValidator.transform(updateCommandDto).name).toBe(
      'create',
    );
  });

  it('zod schema validator works correctly', async () => {
    const incorrectRequest = {
      name: 10,
    };
    expect(() => updateCommandSchema.parse(incorrectRequest)).toThrow(ZodError);
  });
});
