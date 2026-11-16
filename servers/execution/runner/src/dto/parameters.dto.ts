import { z } from 'zod';

export type ParameterValue = string | number | boolean;

// The body of PUT /parameters: the names of parameters and their new
// values
export const parametersBodySchema = z.record(
  z.string(),
  z.union([z.string(), z.number(), z.boolean()]),
);

export type ParametersBody = z.infer<typeof parametersBodySchema>;

// A parameter in GET /parameters: its current value and its declaration
export type ParameterDto = {
  value: ParameterValue;
  type: 'string' | 'number' | 'boolean' | 'enum';
  values?: string[];
  default: ParameterValue;
  controllable: boolean;
};

export type ParametersDto = Record<string, ParameterDto>;
