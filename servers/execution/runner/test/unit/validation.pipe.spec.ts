import { describe, it, expect } from '@jest/globals';
import { ZodError } from 'zod';
import ZodValidationPipe from 'src/validation.pipe';
import {
  ExecuteCommandDto,
  executeCommandSchema,
  MAX_INPUT_BYTES,
  runOptions,
} from 'src/dto/command.dto';

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

  describe('command input', () => {
    const pipe = new ZodValidationPipe(executeCommandSchema);
    // an input of the given size in bytes of its JSON, from two-byte
    // characters and one padding character
    const inputOf = (bytes: number) => {
      const text = 'é'.repeat((bytes - 11) / 2);
      return { text: text + 'x'.repeat((bytes - 11) % 2) };
    };

    it('Should accept an empty input and one of the largest size', () => {
      expect(Buffer.byteLength(JSON.stringify(inputOf(MAX_INPUT_BYTES)))).toBe(
        MAX_INPUT_BYTES,
      );
      expect(pipe.transform({ name: 'create', input: {} })).toEqual({
        name: 'create',
        input: {},
      });
      expect(() =>
        pipe.transform({ name: 'create', input: inputOf(MAX_INPUT_BYTES) }),
      ).not.toThrow();
    });

    it.each([
      ['one byte too large', inputOf(MAX_INPUT_BYTES + 1)],
      ['an array', []],
      ['a string', 'admit'],
      ['null', null],
      // zod's record would drop the key and pass a different input on
      ['an own __proto__ key', JSON.parse('{"__proto__":{"a":1},"b":2}')],
    ])('Should refuse an input that is %s', (_, input) => {
      expect(() =>
        pipe.transform({ name: 'create', input } as ExecuteCommandDto),
      ).toThrow('Validation Failed');
    });

    it('Should give the script its environment and its input as one line of JSON', () => {
      const env = { DT_ID: 'dt-1' };

      expect(runOptions({ name: 'create', input: { ward: 'B' } }, env)).toEqual(
        { env, input: '{"ward":"B"}\n' },
      );
      expect(runOptions({ name: 'create' }, env)).toEqual({ env });
    });

    it('Should pass the caller on with the options of the script', () => {
      const env = { DT_ID: 'dt-1' };

      expect(runOptions({ name: 'create' }, env, 'alice')).toEqual({
        env,
        by: 'alice',
      });
    });
  });
});
