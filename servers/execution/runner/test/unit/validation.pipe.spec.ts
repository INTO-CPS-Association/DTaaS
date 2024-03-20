import { describe, it, expect } from '@jest/globals';
import { ZodError } from 'zod';
import ZodValidationPipe from 'src/validation.pipe';
import { UpdatePhaseDto, updatePhaseSchema } from 'src/dto/phase.dto';

describe('Check UpdatePhaseDto validation pipe', () => {
  it('Validation successful for correct json request', async () => {
    const updatePhaseDto: UpdatePhaseDto = {
      'name': 'create',
    }
    const updatePhaseValidator: ZodValidationPipe = 
      new ZodValidationPipe(updatePhaseSchema);

    expect(updatePhaseValidator.transform(updatePhaseDto))
      .toBe({"name": "create"});
  });

  it('zod schema validator works correctly', async () => {
    const incorrectRequest = {
      'name': 10,
    }
    expect(() => updatePhaseSchema.parse(incorrectRequest))
      .toThrow(ZodError);
    
  });

});
